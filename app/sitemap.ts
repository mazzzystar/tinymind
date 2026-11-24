import { MetadataRoute } from 'next'
import type { Octokit } from '@octokit/rest'
import { createOctokit } from '@/lib/octokit'

const BASE_URL = 'https://tinymind.me'
const PUBLIC_REPO = 'tinymind-blog'

/** Search returns at most 1000 results, so stop there rather than loop forever. */
const MAX_PAGES = 10
const PER_PAGE = 100

interface DiscoveredUser {
  login: string
  updatedAt: string
}

interface DiscoveredPost extends DiscoveredUser {
  id: string
}

interface BlogTreeResult {
  object: {
    entries?: Array<{ name: string; type: string }>
  } | null
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      timeoutMs
    )
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      }
    )
  })
}

/**
 * Find the users who have a TinyMind blog.
 *
 * There is no user table — GitHub is the database — so the only way to
 * enumerate authors is to ask GitHub which accounts have the repository. The
 * previous version hardcoded a single username, which meant every other user's
 * blog was absent from the sitemap entirely.
 */
async function discoverUsers(octokit: Octokit): Promise<DiscoveredUser[]> {
  const users = new Map<string, DiscoveredUser>()

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await octokit.search.repos({
      q: `${PUBLIC_REPO} in:name`,
      per_page: PER_PAGE,
      page,
    })

    for (const repo of data.items) {
      // `in:name` is a substring match, so require the exact repository name.
      if (repo.name !== PUBLIC_REPO || repo.private || !repo.owner?.login) {
        continue
      }
      const login = repo.owner.login
      if (!users.has(login)) {
        users.set(login, { login, updatedAt: repo.pushed_at || repo.updated_at })
      }
    }

    if (data.items.length < PER_PAGE) {
      break
    }
  }

  return Array.from(users.values())
}

/** One GraphQL request enumerates the blog trees for a whole batch of users. */
async function discoverPosts(
  octokit: Octokit,
  users: DiscoveredUser[]
): Promise<DiscoveredPost[]> {
  const batchSize = 100
  const batches: DiscoveredUser[][] = []

  for (let offset = 0; offset < users.length; offset += batchSize) {
    batches.push(users.slice(offset, offset + batchSize))
  }

  const discovered = await Promise.all(batches.map(async (batch, batchIndex) => {
    const declarations = batch
      .flatMap((_, index) => [`$owner${index}: String!`, `$repo${index}: String!`])
      .join(', ')
    const repositories = batch
      .map(
        (_, index) => `
          repo${index}: repository(owner: $owner${index}, name: $repo${index}) {
            object(expression: "HEAD:content/blog") {
              ... on Tree { entries { name type } }
            }
          }
        `
      )
      .join('\n')
    const variables = Object.fromEntries(
      batch.flatMap((user, index) => [
        [`owner${index}`, user.login],
        [`repo${index}`, PUBLIC_REPO],
      ])
    )

    try {
      const data = await octokit.graphql<Record<string, BlogTreeResult | null>>(
        `query(${declarations}) { ${repositories} }`,
        variables
      )
      return batch.flatMap((user, index) => {
        const posts: DiscoveredPost[] = []
        for (const entry of data[`repo${index}`]?.object?.entries ?? []) {
          if (entry.type === 'blob' && entry.name.endsWith('.md') && entry.name !== '.gitkeep') {
            posts.push({ ...user, id: entry.name.replace(/\.md$/, '') })
          }
        }
        return posts
      })
    } catch (error) {
      // Keep the rest of the sitemap useful if one batch changes during crawl.
      console.error(`Sitemap: post discovery failed for batch ${batchIndex + 1}:`, error)
      return []
    }
  }))

  return discovered.flat()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  let users: DiscoveredUser[] = []
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN
  const octokit = createOctokit(token)
  try {
    users = await withTimeout(discoverUsers(octokit), 20_000, 'User discovery')
  } catch (error) {
    // A degraded sitemap beats a failed build or an empty response.
    console.error('Sitemap: user discovery failed, emitting static pages only:', error)
    return staticPages
  }

  const userPages: MetadataRoute.Sitemap = users.flatMap(({ login, updatedAt }) => {
    const lastModified = new Date(updatedAt)
    return [
      { url: `${BASE_URL}/${login}`, lastModified, changeFrequency: 'weekly' as const, priority: 0.8 },
      { url: `${BASE_URL}/${login}/blog`, lastModified, changeFrequency: 'weekly' as const, priority: 0.7 },
      { url: `${BASE_URL}/${login}/thoughts`, lastModified, changeFrequency: 'weekly' as const, priority: 0.6 },
      { url: `${BASE_URL}/${login}/about`, lastModified, changeFrequency: 'monthly' as const, priority: 0.5 },
    ]
  })

  let discoveredPosts: DiscoveredPost[] = []
  try {
    discoveredPosts = await withTimeout(discoverPosts(octokit, users), 20_000, 'Post discovery')
  } catch (error) {
    console.error('Sitemap: post discovery failed, emitting profile pages only:', error)
  }
  const postPages: MetadataRoute.Sitemap = discoveredPosts.map(({ login, id, updatedAt }) => ({
    url: `${BASE_URL}/${login}/blog/${encodeURIComponent(id)}`,
    lastModified: new Date(updatedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const sitemap = [...staticPages, ...userPages, ...postPages].slice(0, 50_000)
  console.log(
    `Sitemap: ${users.length} users and ${discoveredPosts.length} posts discovered, ${sitemap.length} URLs`
  )
  return sitemap
}
