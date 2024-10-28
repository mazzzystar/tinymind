import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import BlogList from "@/components/BlogList";
import { getBlogPosts } from "@/lib/githubApi";
import GitHubSignInButton from "@/components/GitHubSignInButton";

export const revalidate = 60;

export default async function BlogPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return <GitHubSignInButton />;
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
