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
import { Button } from "@/components/ui/button";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useTranslations } from "next-intl";

type FormattedThought = Thought & { formattedTimestamp: string };

export default function PublicThoughtsList({
  thoughts,
}: {
  thoughts: Thought[];
}) {
  const [formattedThoughts, setFormattedThoughts] = useState<
    FormattedThought[]
  >([]);
  const [expandedThoughts, setExpandedThoughts] = useState<
    Record<string, boolean>
  >({});
  const t = useTranslations("HomePage");

  // Check if thought content is long (more than 20 lines)
  const isLongThought = (content: string): boolean => {
    return content.split("\n").length > 20;
  };

  // Toggle expanded state for a thought
  const toggleThoughtExpansion = (id: string) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Get the content to display (truncated or full)
  const getDisplayContent = (thought: Thought) => {
    if (!isLongThought(thought.content) || expandedThoughts[thought.id]) {
      return thought.content;
    }

    // Get first 15 lines if the thought is long and not expanded
    return thought.content.split("\n").slice(0, 15).join("\n") + "\n...";
  };

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
              {getDisplayContent(thought)}
            </ReactMarkdown>

            {isLongThought(thought.content) && (
              <Button
                variant="ghost"
                className="mt-2 text-gray-500 hover:text-gray-700 flex items-center justify-center w-full"
                onClick={() => toggleThoughtExpansion(thought.id)}
              >
                {expandedThoughts[thought.id] ? (
                  <>
                    <FiChevronUp className="mr-2" /> {t("showLess")}
                  </>
                ) : (
                  <>
                    <FiChevronDown className="mr-2" /> {t("showMore")}
                  </>
                )}
              </Button>
            )}
          </div>
          <small className="text-gray-500 self-end mt-2">
            {thought.formattedTimestamp}
          </small>
        </div>
      ))}
    </div>
  );
}
