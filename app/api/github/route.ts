import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteThought, createBlogPost, createThought, getBlogPosts, getThoughts, updateThought, deleteBlogPost, updateBlogPost } from '@/lib/githubApi';

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...data } = await request.json();
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data, null, 2));

    switch (action) {
      case 'createBlogPost':
        await createBlogPost(data.title, data.content, session.accessToken);
        return NextResponse.json({ message: 'Blog post created successfully' });
      case 'updateBlogPost':
        await updateBlogPost(data.id, data.title, data.content, session.accessToken);
        return NextResponse.json({ message: 'Blog post updated successfully' });
      case 'deleteBlogPost':
        await deleteBlogPost(data.id, session.accessToken);
        return NextResponse.json({ message: 'Blog post deleted successfully' });
      case 'createThought':
        await createThought(data.content, data.image, session.accessToken);
        return NextResponse.json({ message: 'Thought created successfully' });
      case 'updateThought':
        await updateThought(data.id, data.content, session.accessToken);
        return NextResponse.json({ message: 'Thought updated successfully' });
      case 'deleteThought':
        await deleteThought(data.id, session.accessToken);
        return NextResponse.json({ message: 'Thought deleted successfully' });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/github POST:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'getBlogPosts':
        const posts = await getBlogPosts(session.accessToken);
        return NextResponse.json(posts);
      case 'getThoughts':
        const thoughts = await getThoughts(session.accessToken);
        return NextResponse.json(thoughts);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/github GET:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
