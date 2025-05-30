import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import "katex/dist/katex.min.css";
import { transformGithubImageUrl } from "@/lib/urlUtils";
import { HTMLAttributes } from "react";

interface BlogPostContentProps {
  title: string;
  date: string;
  content: string;
  headerContent?: React.ReactNode;
}

interface CodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function BlogPostContent({
  title,
  date,
  content,
  headerContent,
}: BlogPostContentProps) {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader className="flex justify-between items-start">
        <div>
          <CardTitle className="text-3xl font-bold">{title}</CardTitle>
          <p className="text-sm text-gray-500">
            {format(new Date(date), "MMMM d, yyyy")}
          </p>
        </div>
        {headerContent}
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code: ({ inline, className, children, ...props }: CodeProps) => {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as { [key: string]: React.CSSProperties }}
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
            {content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
