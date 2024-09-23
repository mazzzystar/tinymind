import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getBlogPostsPublic, getThoughtsPublic } from '@/lib/githubApi';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  const octokit = new Octokit(); // No authentication needed for public repos

  try {
    const blogPosts = await getBlogPostsPublic(octokit, username, 'tinymind-blog');
    const thoughts = await getThoughtsPublic(octokit, username, 'tinymind-blog');

    return NextResponse.json({ blogPosts, thoughts });
  } catch (error) {
    console.error('Error fetching public data:', error);
    return NextResponse.json({ error: 'Failed to fetch public data' }, { status: 500 });
  }
}