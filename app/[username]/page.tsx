import { Octokit } from "@octokit/rest";
import { getBlogPostsPublic, getThoughtsPublic } from "@/lib/githubApi";
import PublicThoughtsList from "@/components/PublicThoughtsList";
import PublicBlogList from "@/components/PublicBlogList";

export default async function PublicHomePage({
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
    const thoughts = await getThoughtsPublic(
      octokit,
      username,
      "tinymind-blog"
    );

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {username}&apos;s TinyMind Blog
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Blog Posts</h2>
            <PublicBlogList posts={blogPosts} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">Thoughts</h2>
            <PublicThoughtsList thoughts={thoughts} />
          </div>
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
