import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import ThoughtsList from "@/components/ThoughtsList";
import { getThoughtsPublic } from "@/lib/githubApi";
import { Octokit } from "@octokit/rest";
import PublicThoughtsList from "@/components/PublicThoughtsList";

export const revalidate = 60;

export default async function ThoughtsPage() {
  const session = await getServerSession(authOptions);
  const username = process.env.GITHUB_USERNAME ?? '';

  if (!session || !session.accessToken) {
    if (username) {
      const octokit = new Octokit();
      const blogPosts = await getThoughtsPublic(
        octokit,
        process.env.GITHUB_USERNAME ?? '',
        "tinymind-blog"
      );
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <PublicThoughtsList thoughts={blogPosts} />
          </div>
        </div>
      );
    } else {
      return (
        <GitHubSignInButton />
      ); 
    }
  }

  return <ThoughtsList username={username} />;
}
