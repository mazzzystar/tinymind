import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ThoughtsList from "@/components/ThoughtsList";

export default async function ThoughtsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div>
        <p>Please sign in to view thoughts</p>
        <a href="/login" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  return <ThoughtsList />;
}
