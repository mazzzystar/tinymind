"use client";

import { useState, useEffect } from "react";
import "katex/dist/katex.min.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Thought } from "@/lib/githubApi";
import { formatTimestamp } from "@/utils/dateFormatting";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

type FormattedThought = Thought & { formattedTimestamp: string };

export default function PublicThoughtsList({
  thoughts,
}: {
  thoughts: Thought[];
}) {
  const [formattedThoughts, setFormattedThoughts] = useState<
    FormattedThought[]
  >([]);

  useEffect(() => {
    const formatted = thoughts.map((thought) => ({
      ...thought,
      formattedTimestamp: formatTimestamp(thought.timestamp),
    }));
    setFormattedThoughts(formatted);
  }, [thoughts]);

  return (
    <div className="space-y-4">
      {formattedThoughts.map((thought) => (
        <div
          key={thought.id}
          className="bg-[#f9f9f9] shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col"
        >
          <div className="text-gray-800 mb-2 prose max-w-none">
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
                blockquote: ({ children }) => (
                  <div className="pl-4 border-l-4 border-gray-200 text-gray-500">
                    {children}
                  </div>
                ),
              }}
            >
              {thought.content}
            </ReactMarkdown>
          </div>
          <small className="text-gray-500 self-end mt-2">
            {thought.formattedTimestamp}
          </small>
        </div>
      ))}
    </div>
  );
}
