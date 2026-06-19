import "server-only";

import { Octokit } from "@octokit/rest";
import { BoundedCache } from "./cache";
import {
  getAboutPagePublic,
  getBlogPostsPublicFast,
  getThoughtsPublic,
} from "./githubApi";
import type { AboutPage, BlogPost, Thought } from "./contentTypes";

const PUBLIC_REPO = "tinymind-blog";
const blogCache = new BoundedCache<BlogPost[]>(100, 5 * 60 * 1000);
const thoughtsCache = new BoundedCache<Thought[]>(100, 5 * 60 * 1000);
const aboutCache = new BoundedCache<AboutPage | null>(100, 5 * 60 * 1000);

function createPublicOctokit() {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  return githubToken ? new Octokit({ auth: githubToken }) : new Octokit();
}

export async function getPublicBlogPosts(username: string): Promise<BlogPost[]> {
  const cacheKey = `blogs:${username}:${PUBLIC_REPO}`;
  const cached = blogCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const blogPosts = await getBlogPostsPublicFast(
    createPublicOctokit(),
    username,
    PUBLIC_REPO
  );
  blogCache.set(cacheKey, blogPosts);
  return blogPosts;
}

export async function getPublicThoughts(username: string): Promise<Thought[]> {
  const cacheKey = `thoughts:${username}:${PUBLIC_REPO}`;
  const cached = thoughtsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const thoughts = await getThoughtsPublic(createPublicOctokit(), username, PUBLIC_REPO);
  thoughtsCache.set(cacheKey, thoughts);
  return thoughts;
}

export async function getPublicAboutPage(username: string): Promise<AboutPage | null> {
  const cacheKey = `about:${username}:${PUBLIC_REPO}`;
  const cached = aboutCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const aboutPage = await getAboutPagePublic(createPublicOctokit(), username, PUBLIC_REPO);
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
