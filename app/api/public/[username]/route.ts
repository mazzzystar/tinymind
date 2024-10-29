import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getBlogPostsPublic, getThoughtsPublic } from '@/lib/githubApi';

export const dynamic = 'force-dynamic'; // Disable caching for this route
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  // Add cache control headers
  const headers = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    'Content-Type': 'application/json',
  };

  const username = params.username;
  const octokit = new Octokit(); // No authentication needed for public repos

  try {
    const blogPosts = await getBlogPostsPublic(octokit, username, 'tinymind-blog');
    const thoughts = await getThoughtsPublic(octokit, username, 'tinymind-blog');

    return NextResponse.json(
      { blogPosts, thoughts },
      { 
        headers,
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching public data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public data' },
      { 
        headers,
        status: 500 
      }
    );
  }
}
