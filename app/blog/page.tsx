import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import BlogList from "@/components/BlogList";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import { getBlogPosts, getBlogPostsPublic } from "@/lib/githubApi";
import { Octokit } from "@octokit/rest";
import PublicBlogList from "@/components/PublicBlogList";

export default async function BlogPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    const username = process.env.GITHUB_USERNAME ?? '';
    
    if (username) {
      const octokit = new Octokit();
      const blogPosts = await getBlogPostsPublic(
        octokit,
        username,
        "tinymind-blog"
      );

      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <PublicBlogList posts={blogPosts} username={username} />
          </div>
        </div>
      );
    } else {
      return (
        <GitHubSignInButton />
      );
    }
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
