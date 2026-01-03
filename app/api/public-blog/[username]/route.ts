import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getBlogPostsPublicFast, BlogPost } from '@/lib/githubApi';
import { BoundedCache } from '@/lib/cache';

// Bounded cache with max 100 users and 5 minute TTL
const blogCache = new BoundedCache<BlogPost[]>(100, 5 * 60 * 1000);

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  const cacheKey = `${username}/tinymind-blog`;

  try {
    // Check cache first
    const cached = blogCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Use GitHub token if available, otherwise fallback to unauthenticated
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    const octokit = githubToken 
      ? new Octokit({ auth: githubToken })
      : new Octokit();

    // **PERFORMANCE**: Use the ultra-fast Tree API method
    const blogPosts = await getBlogPostsPublicFast(
      octokit,
      username,
      'tinymind-blog'
    );

    // Cache the result
    blogCache.set(cacheKey, blogPosts);

    return NextResponse.json(blogPosts);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in public-blog API:', error);
    }

    // Return cached data if available (BoundedCache handles TTL)
    const cached = blogCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Handle rate limiting
    if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests to GitHub API' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
} 