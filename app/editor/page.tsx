import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import EditorComponent from "@/components/Editor";
import GitHubSignInButton from "@/components/GitHubSignInButton";

export default async function EditorPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <GitHubSignInButton />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <EditorComponent />
    </div>
  );
}
