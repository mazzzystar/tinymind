import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ThoughtsList from "@/components/ThoughtsList";
import GitHubSignInButton from "@/components/GitHubSignInButton";

export default async function ThoughtsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            How it works:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>
              We create a public &quot;tinymind-blog&quot; repo in your GitHub.
            </li>
            <li>
              Your new blog & thoughts will be automatically committed to this
              repo.
            </li>
            <li>
              Your data is stored only on GitHub, independent of this site.
            </li>
          </ol>
        </div>
        <GitHubSignInButton />
      </div>
    );
  }

  return <ThoughtsList />;
}
