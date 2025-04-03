import { Octokit } from "@octokit/rest";
import { getAboutPagePublic } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default async function PublicAboutPage({
  params,
}: {
  params: { username: string };
}) {
  const octokit = new Octokit();
  const username = params.username;
  const t = await getTranslations("HomePage");

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
            <h1 className="text-3xl font-bold">{t("about")}</h1>
          </CardHeader>
          <CardContent className="py-6">
            {aboutPage ? (
              <div className="prose max-w-none text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({
                      inline,
                      className,
                      children,
                      ...props
                    }: {
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                    } & React.HTMLAttributes<HTMLElement>) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={
                            tomorrow as { [key: string]: React.CSSProperties }
                          }
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    a: ({ children, ...props }) => (
                      <a
                        {...props}
                        className="text-gray-400 no-underline hover:text-gray-600 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    blockquote: ({ children }) => (
                      <div className="pl-4 border-l-4 border-gray-200 text-gray-400">
                        {children}
                      </div>
                    ),
                  }}
                >
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
