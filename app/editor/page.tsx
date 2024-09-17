import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import EditorComponent from "@/components/Editor";

export default async function EditorPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div>
        <p>Please sign in to access the editor</p>
        <a href="/login" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  return <EditorComponent />;
}
