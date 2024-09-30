import "katex/dist/katex.min.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Thought } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatTimestamp } from "@/utils/dateFormatting";

export default function PublicThoughtsList({
  thoughts,
}: {
  thoughts: Thought[];
}) {
  return (
    <div className="space-y-4">
      {thoughts.map((thought) => (
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
            {formatTimestamp(thought.timestamp)}
          </small>
        </div>
      ))}
    </div>
  );
}
