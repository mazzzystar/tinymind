"use client";

import { useState, useMemo } from "react";
import { Thought } from "@/lib/githubApi";
import { formatTimestamp } from "@/utils/dateFormatting";
import { Button } from "@/components/ui/button";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

type FormattedThought = Thought & { formattedTimestamp: string };

export default function PublicThoughtsList({
  thoughts,
}: {
  thoughts: Thought[];
}) {
  const [expandedThoughts, setExpandedThoughts] = useState<
    Record<string, boolean>
  >({});
  const t = useTranslations("HomePage");

  // Memoize formatted thoughts instead of using useEffect + useState
  const formattedThoughts = useMemo<FormattedThought[]>(() =>
    thoughts.map((thought) => ({
      ...thought,
      formattedTimestamp: formatTimestamp(thought.timestamp),
    })), [thoughts]);

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

  return (
    <div className="space-y-4">
      {formattedThoughts.map((thought) => (
        <div
          key={thought.id}
          className="bg-[#f9f9f9] shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col"
        >
          <div className="text-gray-800 mb-2 prose max-w-none">
            <MarkdownRenderer content={getDisplayContent(thought)} />

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
