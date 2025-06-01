import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getBlogPostsPublic, getThoughtsPublic, getAboutPagePublic } from '@/lib/githubApi';

export const dynamic = 'force-dynamic'; // Disable caching for this route
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  // Add cache control headers
  const headers = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    'Content-Type': 'application/json',
  };

  const username = params.username;
  
  // Use authenticated GitHub token for higher rate limits
  const githubToken = process.env.GITHUB_TOKEN;
  const octokit = githubToken ? new Octokit({ auth: githubToken }) : new Octokit();

  try {
    // Fetch all public data concurrently
    const [blogPosts, thoughts, aboutPage] = await Promise.all([
      getBlogPostsPublic(octokit, username, 'tinymind-blog'),
      getThoughtsPublic(octokit, username, 'tinymind-blog'),
      getAboutPagePublic(octokit, username, 'tinymind-blog').catch(() => null) // Don't fail if no about page
    ]);

    return NextResponse.json(
      { blogPosts, thoughts, aboutPage },
      { 
        headers,
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching public data:', error);
    
    // Handle rate limiting specifically
    if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'GitHub API rate limit exceeded. Please try again later.' },
        { 
          headers,
          status: 429 
        }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch public data' },
      { 
        headers,
        status: 500 
      }
    );
  }
}
