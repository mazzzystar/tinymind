import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ThoughtsList from "@/components/ThoughtsList";
import GitHubSignInButton from "@/components/GitHubSignInButton";

export const revalidate = 60;

export default async function ThoughtsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return <GitHubSignInButton />;
  }

  return <ThoughtsList />;
}
