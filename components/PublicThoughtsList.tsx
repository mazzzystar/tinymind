import { Thought } from "@/lib/githubApi";
import ReactMarkdown from "react-markdown";

export default function PublicThoughtsList({
  thoughts,
}: {
  thoughts: Thought[];
}) {
  return (
    <div className="space-y-4">
      {thoughts.map((thought) => (
        <div key={thought.id} className="bg-gray-100 p-4 rounded-lg">
          <ReactMarkdown>{thought.content}</ReactMarkdown>
          <p className="text-sm text-gray-500 mt-2">
            {new Date(thought.timestamp).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
