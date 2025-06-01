import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getBlogPostsPublicFast, BlogPost } from '@/lib/githubApi';

// Cache for blog posts with timestamps
const blogCache = new Map<string, { data: BlogPost[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  const cacheKey = `${username}/tinymind-blog`;
  
  try {
    // Check cache first
    const cached = blogCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
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
    blogCache.set(cacheKey, {
      data: blogPosts,
      timestamp: Date.now()
    });

    return NextResponse.json(blogPosts);
  } catch (error: unknown) {
    console.error('Error in public-blog API:', error);
    
    // Return cached data if available, even if stale
    const cached = blogCache.get(cacheKey);
    if (cached) {
      console.log('Returning stale cached data due to error');
      return NextResponse.json(cached.data);
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