import { NextRequest, NextResponse } from 'next/server';
import { getPublicBlogPosts } from '@/lib/publicData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const blogPosts = await getPublicBlogPosts(username);
    return NextResponse.json(blogPosts);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in public-blog API:', error);
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
