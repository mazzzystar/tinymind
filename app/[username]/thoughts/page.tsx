import { Octokit } from "@octokit/rest";
import { getThoughtsPublic } from "@/lib/githubApi";
import PublicThoughtsList from "@/components/PublicThoughtsList";

export default async function PublicThoughtsPage({
  params,
}: {
  params: { username: string };
}) {
  const octokit = new Octokit();
  const username = params.username;

  try {
    const thoughts = await getThoughtsPublic(
      octokit,
      username,
      "tinymind-blog"
    );

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* <h2 className="text-2xl font-semibold mb-4">Thoughts</h2> */}
        <PublicThoughtsList thoughts={thoughts} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching public thoughts:", error);
    return (
      <div>
        Error loading public thoughts. The user may not have a TinyMind Blog.
      </div>
    );
  }
}
