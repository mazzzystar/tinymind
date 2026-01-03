import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteThought, createBlogPost, createThought, getBlogPosts, getThoughts, updateThought, deleteBlogPost, updateBlogPost, getBlogPost, getAboutPage, createAboutPage, updateAboutPage, uploadImage } from '@/lib/githubApi';
import { createErrorResponse, ErrorCodes } from '@/lib/apiErrors';
import { blogPostSchema, thoughtSchema, aboutPageSchema, blogIdSchema, thoughtIdSchema, apiActionSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic'; // Disable caching for this route
export const revalidate = 60; // Revalidate every 60 seconds

// Add cache control headers
const headers = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  'Content-Type': 'application/json',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', code: ErrorCodes.UNAUTHORIZED },
        { status: 401, headers }
      );
    }

    // Handle FormData requests (for image uploads from Chrome extension)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const action = formData.get('action');

      if (action === 'uploadImage') {
        const file = formData.get('file') as File | null;

        if (!file) {
          return NextResponse.json(
            { error: 'No file provided', code: ErrorCodes.BAD_REQUEST },
            { status: 400, headers }
          );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          return NextResponse.json(
            { error: 'Only image files are allowed', code: ErrorCodes.BAD_REQUEST },
            { status: 400, headers }
          );
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File size must be less than 10MB', code: ErrorCodes.BAD_REQUEST },
            { status: 400, headers }
          );
        }

        const url = await uploadImage(file, session.accessToken);
        return NextResponse.json({ url }, { headers });
      }

      return NextResponse.json(
        { error: 'Invalid action for FormData request', code: ErrorCodes.BAD_REQUEST },
        { status: 400, headers }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Validate action
    const actionResult = apiActionSchema.safeParse(action);
    if (!actionResult.success) {
      return NextResponse.json(
        { error: 'Invalid action', code: ErrorCodes.BAD_REQUEST },
        { status: 400, headers }
      );
    }

    switch (action) {
      case 'createBlogPost': {
        const validated = blogPostSchema.parse({ title: data.title, content: data.content });
        const createResult = await createBlogPost(validated.title, validated.content, session.accessToken);
        return NextResponse.json({ message: 'Blog post created successfully', newId: createResult.newId }, { headers });
      }

      case 'updateBlogPost': {
        const validatedId = blogIdSchema.parse(data.id);
        const validated = blogPostSchema.parse({ title: data.title, content: data.content });
        const result = await updateBlogPost(validatedId, validated.title, validated.content, session.accessToken);
        if (result && result.newId) {
          return NextResponse.json({ message: 'Blog post updated successfully', newId: result.newId }, { headers });
        }
        return NextResponse.json({ message: 'Blog post updated successfully' }, { headers });
      }

      case 'deleteBlogPost': {
        const validatedId = blogIdSchema.parse(data.id);
        await deleteBlogPost(validatedId, session.accessToken);
        return NextResponse.json({ message: 'Blog post deleted successfully' }, { headers });
      }

      case 'createThought': {
        const validated = thoughtSchema.parse({ content: data.content, image: data.image });
        await createThought(validated.content, validated.image, session.accessToken);
        return NextResponse.json({ message: 'Thought created successfully' }, { headers });
      }

      case 'updateThought': {
        const validatedId = thoughtIdSchema.parse(data.id);
        const validated = thoughtSchema.parse({ content: data.content });
        await updateThought(validatedId, validated.content, session.accessToken);
        return NextResponse.json({ message: 'Thought updated successfully' }, { headers });
      }

      case 'deleteThought': {
        const validatedId = thoughtIdSchema.parse(data.id);
        await deleteThought(validatedId, session.accessToken);
        return NextResponse.json({ message: 'Thought deleted successfully' }, { headers });
      }

      case 'createAboutPage': {
        const validated = aboutPageSchema.parse({ content: data.content });
        await createAboutPage(validated.content, session.accessToken);
        return NextResponse.json({ message: 'About page created successfully' }, { headers });
      }

      case 'updateAboutPage': {
        const validated = aboutPageSchema.parse({ content: data.content });
        await updateAboutPage(validated.content, session.accessToken);
        return NextResponse.json({ message: 'About page updated successfully' }, { headers });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action', code: ErrorCodes.BAD_REQUEST },
          { status: 400, headers }
        );
    }
  } catch (error) {
    // Log error server-side only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in /api/github POST:', error);
    }
    return createErrorResponse(error, headers);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', code: ErrorCodes.UNAUTHORIZED },
        { status: 401, headers }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    switch (action) {
      case 'getBlogPosts': {
        const posts = await getBlogPosts(session.accessToken);
        return NextResponse.json(posts, { headers });
      }

      case 'getBlogPost': {
        if (!id) {
          return NextResponse.json(
            { error: 'Missing id parameter', code: ErrorCodes.BAD_REQUEST },
            { status: 400, headers }
          );
        }
        const validatedId = blogIdSchema.parse(id);
        const post = await getBlogPost(validatedId, session.accessToken);
        return NextResponse.json(post, { headers });
      }

      case 'getThoughts': {
        const thoughts = await getThoughts(session.accessToken);
        return NextResponse.json(thoughts, { headers });
      }

      case 'getAboutPage': {
        const aboutPage = await getAboutPage(session.accessToken);
        return NextResponse.json(aboutPage, { headers });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action', code: ErrorCodes.BAD_REQUEST },
          { status: 400, headers }
        );
    }
  } catch (error) {
    // Log error server-side only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in /api/github GET:', error);
    }
    return createErrorResponse(error, headers);
  }
}
