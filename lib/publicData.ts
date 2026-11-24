import "server-only";

import { createOctokit } from "./octokit";
import { BoundedCache, registerInvalidatableCache } from "./cache";
import {
  getAboutPagePublic,
  getBlogPostsPublicFast,
  getThoughtsPublic,
} from "./githubApi";
import type { AboutPage, BlogPost, Thought } from "./contentTypes";
import { ApiError, isApiErrorStatus } from "./apiErrors";
import { usernameSchema } from "./validation";

const PUBLIC_REPO = "tinymind-blog";
const blogCache = new BoundedCache<BlogPost[]>(100, 5 * 60 * 1000);
const thoughtsCache = new BoundedCache<Thought[]>(100, 5 * 60 * 1000);
const aboutCache = new BoundedCache<AboutPage | null>(100, 5 * 60 * 1000);
const profileCache = new BoundedCache<boolean>(1000, 5 * 60 * 1000);
const profileChecks = new BoundedCache<Promise<string>>(1000, 30 * 1000);

// So invalidateOwner() reaches these after a write.
registerInvalidatableCache(blogCache);
registerInvalidatableCache(thoughtsCache);
registerInvalidatableCache(aboutCache);
registerInvalidatableCache(profileCache);

function createPublicOctokit() {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  return createOctokit(githubToken);
}

/**
 * Validate a public profile without spending the shared GitHub API token.
 *
 * Every TinyMind repository contains content/thoughts.json, even when it is
 * empty. raw.githubusercontent.com is CDN-backed and does not consume REST or
 * GraphQL quota, so random usernames are rejected before authenticated API
 * calls. Negative results are bounded and cached to keep repeated probes cheap.
 */
export async function assertPublicProfile(username: string): Promise<string> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    throw ApiError.notFound("TinyMind profile not found");
  }

  const owner = parsed.data.toLowerCase();
  const profileKey = `profile:${owner}:${PUBLIC_REPO}`;
  const cached = profileCache.get(profileKey);
  if (cached === true) {
    return owner;
  }
  if (cached === false) {
    throw ApiError.notFound("TinyMind profile not found");
  }

  const inFlight = profileChecks.get(profileKey);
  if (inFlight) return inFlight;

  const check = verifyPublicProfile(owner, profileKey)
    .finally(() => profileChecks.delete(profileKey));
  profileChecks.set(profileKey, check);
  return check;
}

async function verifyPublicProfile(owner: string, profileKey: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${PUBLIC_REPO}/HEAD/content/thoughts.json`,
      {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
  } catch (error) {
    console.error(`Failed to verify public profile ${owner}:`, error);
    throw ApiError.serviceUnavailable("GitHub is temporarily unavailable");
  }

  if (response.status === 404) {
    profileCache.set(profileKey, false);
    throw ApiError.notFound("TinyMind profile not found");
  }
  if (response.status === 403 || response.status === 429) {
    throw ApiError.rateLimited("GitHub rate limit exceeded");
  }
  if (!response.ok) {
    throw ApiError.serviceUnavailable("GitHub is temporarily unavailable");
  }

  profileCache.set(profileKey, true);
  return owner;
}

export function isPublicProfileNotFound(error: unknown): boolean {
  return isApiErrorStatus(error, 404);
}

export async function getPublicBlogPosts(username: string): Promise<BlogPost[]> {
  const owner = await assertPublicProfile(username);
  const cacheKey = `blogs:${owner}:${PUBLIC_REPO}`;
  const cached = blogCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const blogPosts = await getBlogPostsPublicFast(
    createPublicOctokit(),
    owner,
    PUBLIC_REPO
  );
  blogCache.set(cacheKey, blogPosts);
  return blogPosts;
}

export async function getPublicThoughts(username: string): Promise<Thought[]> {
  const owner = await assertPublicProfile(username);
  const cacheKey = `thoughts:${owner}:${PUBLIC_REPO}`;
  const cached = thoughtsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const thoughts = await getThoughtsPublic(createPublicOctokit(), owner, PUBLIC_REPO);
  thoughtsCache.set(cacheKey, thoughts);
  return thoughts;
}

export async function getPublicAboutPage(username: string): Promise<AboutPage | null> {
  const owner = await assertPublicProfile(username);
  const cacheKey = `about:${owner}:${PUBLIC_REPO}`;
  const cached = aboutCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const aboutPage = await getAboutPagePublic(createPublicOctokit(), owner, PUBLIC_REPO);
  aboutCache.set(cacheKey, aboutPage);
  return aboutPage;
}

export async function getPublicProfileData(username: string) {
  return Promise.all([
    getPublicBlogPosts(username),
    getPublicThoughts(username),
    getPublicAboutPage(username),
  ]).then(([blogPosts, thoughts, aboutPage]) => ({
    blogPosts,
    thoughts,
    aboutPage,
  }));
}
