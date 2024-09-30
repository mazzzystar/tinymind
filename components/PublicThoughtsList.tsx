"use client";

import { useState, useEffect } from "react";
import "katex/dist/katex.min.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Thought } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatTimestamp } from "@/utils/dateFormatting";

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
