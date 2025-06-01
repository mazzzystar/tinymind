import { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";
  const canonicalUrl = `${baseUrl}/${params.username}/about`;

  return {
    title: `About ${params.username} - TinyMind`,
    description: `Learn more about ${params.username}. Personal information and background shared on TinyMind.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `About ${params.username}`,
      description: `Learn more about ${params.username} on TinyMind.`,
      url: canonicalUrl,
      siteName: "TinyMind",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `About ${params.username}`,
      description: `Learn more about ${params.username} on TinyMind.`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function PublicAboutPage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username;

  try {
    // Use the authenticated API endpoint instead of direct GitHub API
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/public/${username}`,
      {
        next: { revalidate: 300 }, // 5 minutes cache
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const aboutPage = data.aboutPage;

    if (!aboutPage) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>About {username}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                {username} hasn&apos;t written an about page yet.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>About {username}</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
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
                    <code className={className} {...props}>
                      {children}
                    </code>
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
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching public about page:", error);
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>About {username}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Error loading about page. The user may not have a TinyMind Blog.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
