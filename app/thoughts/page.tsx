import GitHubSignInButton from "@/components/GitHubSignInButton";
import NotesList from "@/components/NotesList";
import PublicNotesList from "@/components/PublicNotesList";
import { authOptions } from "@/lib/auth";
import { createGitHubAPIClient } from "@/lib/client";
import { getServerSession } from "next-auth/next";

export const revalidate = 60;

export default async function NotesPage() {
  const session = await getServerSession(authOptions);
  const username = process.env.GITHUB_USERNAME ?? '';

  if (!session || !session.accessToken) {
    if (username) {
      const blogPosts = await createGitHubAPIClient('').getNotes(
        process.env.GITHUB_USERNAME ?? '',
        "tinymind-blog"
      )
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <PublicNotesList thoughts={blogPosts} />
          </div>
        </div>
      );
    } else {
      return (
        <GitHubSignInButton />
      ); 
    }
  }

  return <NotesList username={username} />;
}
