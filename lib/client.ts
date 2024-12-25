import { BlogPost, Note } from './types'

import { Octokit } from '@octokit/rest'
import { getCachedOrFetch } from './cache'

const getFirstImageURLFrom = (content: string): string | null => {
  const imgRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp))/i
  const match = imgRegex.exec(content)
  if (match) {
    const url = match[1]
    return url.startsWith('https://github') ? `${url}?raw=true` : url
  }
  return null
}

class GitHubAPIClient {
  private accessToken: string

  constructor(token: string) {
    this.accessToken = token
  }

  async getBlogPosts(owner?: string, repo?: string): Promise<BlogPost[]> {
    return getCachedOrFetch(`${owner}/${repo}`, async () => {
      const octokit = this.accessToken ? new Octokit({ auth: this.accessToken }) : new Octokit()

      if (!owner || !repo) {
        const { data: user } = await octokit.users.getAuthenticated()
        owner = user.login
        repo = 'tinymind-blog'
      }
      try {
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: 'content/blog',
        })

        if (!Array.isArray(response.data)) {
          console.warn('Unexpected response from GitHub API: data is not an array')
          return []
        }

        const posts = await Promise.all(
          response.data
            .filter(
              (file) =>
                file.type === 'file' && file.name !== '.gitkeep' && file.name.endsWith('.md')
            )
            .map(async (file) => {
              return this.getBlogPost(file.name, owner, repo)
            })
        )

        return posts.filter((post): post is BlogPost => post !== undefined)
      } catch (error) {
        console.error('Error fetching blog posts:', error)
        // If the blog directory doesn't exist, return an empty array
        if (error instanceof Error && 'status' in error && error.status === 404) {
          console.log('Blog directory does not exist, returning empty array')
          return []
        }
        throw error
      }
    })
  }

  async getBlogPost(name: string, owner?: string, repo?: string): Promise<BlogPost | undefined> {
    return getCachedOrFetch(`${owner}/${repo}/content/blog/${name}`, async () => {
      const octokit = this.accessToken ? new Octokit({ auth: this.accessToken }) : new Octokit()
      if (!owner || !repo) {
        const { data: user } = await octokit.users.getAuthenticated()
        owner = user.login
        repo = 'tinymind-blog'
      }

      const contentResponse = await octokit.repos.getContent({
        owner,
        repo,
        path: `content/blog/${name}`,
      })

      if ('content' in contentResponse.data) {
        const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8')
        const titleMatch = content.match(/title:\s*(.+)/)
        const dateMatch = content.match(/date:\s*(.+)/)

        return {
          id: name.replace('.md', ''),
          title: titleMatch
            ? decodeURIComponent(titleMatch[1])
            : decodeURIComponent(name.replace('.md', '')),
          content,
          imageUrl: getFirstImageURLFrom(content),
          date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
        }
      }
    })
  }

  async getNotes(owner?: string, repo?: string): Promise<Note[]> {
    return getCachedOrFetch(`${owner}/${repo}/content/thoughts.json`, async () => {
      const octokit = this.accessToken ? new Octokit({ auth: this.accessToken }) : new Octokit()

      if (!owner || !repo) {
        const { data: user } = await octokit.users.getAuthenticated()
        owner = user.login
        repo = 'tinymind-blog'
      }

      try {
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: 'content/thoughts.json',
        })

        if (Array.isArray(response.data) || !('content' in response.data)) {
          return []
        }

        const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
        return JSON.parse(content) as Note[]
      } catch (error) {
        console.error('Error fetching public thoughts:', error)
        return []
      }
    })
  }
}

export const createGitHubAPIClient = (token: string) => new GitHubAPIClient(token)
