import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import EditorComponent from "@/components/Editor";
import GitHubSignInButton from "@/components/GitHubSignInButton";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await getServerSession(authOptions);
  const defaultType = searchParams.type === "blog" ? "blog" : "thought";

  if (!session) {

    const username = process.env.GITHUB_USERNAME;
    if (!username) { 
      return <GitHubSignInButton />;
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <EditorComponent defaultType={defaultType} />
    </div>
  );
}
