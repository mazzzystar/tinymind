import { Octokit } from "@octokit/rest";
import { getAboutPagePublic } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PublicAboutPage({
  params,
}: {
  params: { username: string };
}) {
  const octokit = new Octokit();
  const username = params.username;

  try {
    const aboutPage = await getAboutPagePublic(
      octokit,
      username,
      "tinymind-blog"
    );

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="border-b border-gray-100 pb-2">
            <CardTitle>About {username}</CardTitle>
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
                  This user hasn&apos;t created an about page yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching public about page:", error);
    return (
      <div>
        Error loading about page. The user may not have a TinyMind Blog.
      </div>
    );
  }
}
