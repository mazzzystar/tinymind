import { Octokit } from "@octokit/rest";
import { getBlogPostsPublic } from "@/lib/githubApi";
import PublicBlogList from "@/components/PublicBlogList";

export default async function PublicBlogListPage({
  params,
}: {
  params: { username: string };
}) {
  const octokit = new Octokit();
  const username = params.username;

  try {
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
  } catch (error) {
    console.error("Error fetching public data:", error);
    return (
      <div>
        Error loading public data. The user may not have a TinyMind Blog.
      </div>
    );
  }
}
