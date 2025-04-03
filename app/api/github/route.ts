import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteThought, createBlogPost, createThought, getBlogPosts, getThoughts, updateThought, deleteBlogPost, updateBlogPost, getBlogPost, getAboutPage, createAboutPage, updateAboutPage } from '@/lib/githubApi';

export const dynamic = 'force-dynamic'; // Disable caching for this route
export const revalidate = 60; // Revalidate every 60 seconds

// Add cache control headers
const headers = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  'Content-Type': 'application/json',
};

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { action, ...data } = await request.json();
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data, null, 2));

    switch (action) {
      case 'createBlogPost':
        const createResult = await createBlogPost(data.title, data.content, session.accessToken);
        return NextResponse.json({ message: 'Blog post created successfully', newId: createResult.newId }, { headers });
      case 'updateBlogPost':
        const result = await updateBlogPost(data.id, data.title, data.content, session.accessToken);
        if (result && result.newId) {
          return NextResponse.json({ message: 'Blog post updated successfully', newId: result.newId }, { headers });
        }
        return NextResponse.json({ message: 'Blog post updated successfully' }, { headers });
      case 'deleteBlogPost':
        await deleteBlogPost(data.id, session.accessToken);
        return NextResponse.json({ message: 'Blog post deleted successfully' }, { headers });
      case 'createThought':
        await createThought(data.content, data.image, session.accessToken);
        return NextResponse.json({ message: 'Thought created successfully' }, { headers });
      case 'updateThought':
        await updateThought(data.id, data.content, session.accessToken);
        return NextResponse.json({ message: 'Thought updated successfully' }, { headers });
      case 'deleteThought':
        await deleteThought(data.id, session.accessToken);
        return NextResponse.json({ message: 'Thought deleted successfully' }, { headers });
      case 'createAboutPage':
        await createAboutPage(data.content, session.accessToken);
        return NextResponse.json({ message: 'About page created successfully' }, { headers });
      case 'updateAboutPage':
        await updateAboutPage(data.content, session.accessToken);
        return NextResponse.json({ message: 'About page updated successfully' }, { headers });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }
  } catch (error) {
    console.error('Error in /api/github POST:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500, headers });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500, headers });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    switch (action) {
      case 'getBlogPosts':
        const posts = await getBlogPosts(session.accessToken);
        return NextResponse.json(posts, { headers });
      case 'getBlogPost':
        if (!id) {
          return NextResponse.json({ error: 'Missing id parameter' }, { status: 400, headers });
        }
        const post = await getBlogPost(id, session.accessToken);
        return NextResponse.json(post, { headers });
      case 'getThoughts':
        const thoughts = await getThoughts(session.accessToken);
        return NextResponse.json(thoughts, { headers });
      case 'getAboutPage':
        const aboutPage = await getAboutPage(session.accessToken);
        return NextResponse.json(aboutPage, { headers });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }
  } catch (error) {
    console.error('Error in /api/github GET:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500, headers });
  }
}
