import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAboutPage } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiEdit } from "react-icons/fi";

export const revalidate = 60;

export default async function AboutPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return <GitHubSignInButton />;
  }

  try {
    const aboutPage = await getAboutPage(session.accessToken);

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="border-b border-gray-100 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>About</CardTitle>
              <Button variant="outline" asChild size="sm">
                <Link href="/editor?type=about">
                  <FiEdit className="mr-1" />
                  Edit
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            {aboutPage ? (
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aboutPage.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <p className="mb-4">
                  You haven&apos;t created an about page yet.
                </p>
                <Button asChild>
                  <Link href="/editor?type=about">Create About Page</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching about page:", error);
    return (
      <div className="error-message">
        An error occurred while fetching about page: {(error as Error).message}
      </div>
    );
  }
}
