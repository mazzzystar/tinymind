"use client";

import "katex/dist/katex.min.css";

import { useEffect, useState } from "react";

import { Note } from "@/lib/types";
import { NoteCard } from "./NotesList"; // Import NoteCard from NotesList
import { formatTimestamp } from "@/utils/dateFormatting";

type FormattedNote = Note & { formattedTimestamp: string };

export default function PublicNotesList({
  thoughts,
}: {
  thoughts: Note[];
}) {
  const [formattedNotes, setFormattedNotes] = useState<
    FormattedNote[]
  >([]);

  useEffect(() => {
    const formatted = thoughts.map((thought) => ({
      ...thought,
      formattedTimestamp: formatTimestamp(thought.timestamp),
    }));
    setFormattedNotes(formatted);
  }, [thoughts]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {formattedNotes.filter((_, index) => index % 2 !== 0).map((thought) => (
            <NoteCard
              key={thought.id}
              thought={thought}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {thoughts.filter((_, index) => index % 2 === 0).map((thought) => (
            <NoteCard
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
