"use client";

import { useState, useEffect } from "react";
import "katex/dist/katex.min.css";
import { Thought } from "@/lib/githubApi";
import { formatTimestamp } from "@/utils/dateFormatting";
import { ThoughtCard } from "./ThoughtsList"; // Import ThoughtCard from ThoughtsList

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
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {formattedThoughts.filter((_, index) => index % 2 !== 0).map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {thoughts.filter((_, index) => index % 2 === 0).map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}