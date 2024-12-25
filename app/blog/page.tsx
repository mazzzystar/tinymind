import BlogList from "@/components/BlogList";
import { authOptions } from "@/lib/auth";
import { createGitHubAPIClient } from '@/lib/client'
import { getServerSession } from "next-auth/next";

export const revalidate = 60;

export default async function BlogPage() {
  const session = await getServerSession(authOptions);

  const client = createGitHubAPIClient(session?.accessToken ?? '');

  const username = process.env.GITHUB_USERNAME ?? '';
  try {
    const posts = await client.getBlogPosts(username ?? '', "tinymind-blog");
    return <BlogList posts={posts} />;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return (
      <div className="error-message">
        An error occurred while fetching blog posts: {(error as Error).message}
      </div>
    );
  }
}
