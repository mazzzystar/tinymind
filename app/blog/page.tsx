import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import BlogList from "@/components/BlogList";
import { getBlogPosts } from "@/lib/githubApi";

export default async function BlogPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return (
      <div>
        <p>Please sign in to view blog posts</p>
        <a href="/login" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  try {
    const posts = await getBlogPosts(session.accessToken);
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
