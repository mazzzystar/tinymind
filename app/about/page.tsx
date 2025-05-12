import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAboutPage } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FiEdit } from "react-icons/fi";
import { getTranslations } from "next-intl/server";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { transformGithubImageUrl } from "@/lib/urlUtils";
import React, { HTMLAttributes } from "react";

export const revalidate = 60;

interface CodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default async function AboutPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("HomePage");

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
              <h1 className="text-3xl font-bold">{t("about")}</h1>
              <Button variant="outline" asChild size="sm">
                <Link href="/editor?type=about">
                  <FiEdit className="mr-1" />
                  {t("edit")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            {aboutPage ? (
              <div className="prose max-w-none text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code: ({
                      inline,
                      className,
                      children,
                      ...props
                    }: CodeProps) => {
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
                    img: (props) => {
                      const transformedSrc = transformGithubImageUrl(props.src);
                      return (
                        <img
                          {...props}
                          src={transformedSrc}
                          alt={props.alt || "image"}
                        />
                      );
                    },
                  }}
                >
                  {aboutPage.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <p className="mb-4">
                  You haven&apos;t created an about page yet.
                </p>
                <Button asChild>
                  <Link href="/editor?type=about">
                    {t("createAboutPage") || "Create About Page"}
                  </Link>
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
