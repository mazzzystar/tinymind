"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getThoughts, Thought } from "@/lib/githubApi";
import GitHubSignInButton from "./GitHubSignInButton";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("HomePage");

  useEffect(() => {
    async function fetchThoughts() {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        setError("Please log in to view thoughts");
        return;
      }
      if (!session?.accessToken) {
        setError("Access token not available");
        return;
      }

      try {
        const fetchedThoughts = await getThoughts(session.accessToken);
        setThoughts(fetchedThoughts);
        setError(null); // Clear any previous errors
      } catch (error) {
        console.error("Error fetching thoughts:", error);
        if (
          error instanceof Error &&
          (error.message.includes("Bad credentials") ||
            error.message.includes("Failed to get authenticated user"))
        ) {
          setError("authentication_failed");
        } else {
          // Instead of setting an error, we'll just leave the thoughts array empty
          setThoughts([]);
        }
      }
    }

    fetchThoughts();
  }, [session, status]);

  if (status === "unauthenticated" || error === "authentication_failed") {
    return <GitHubSignInButton />;
  }

  if (error && error !== "authentication_failed") {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {thoughts.length === 0 ? (
        <div className="flex flex-col items-center mt-8 space-y-4">
          <p className="text-gray-500">{t("noThoughtsYet")}</p>
          <Button
            onClick={() => router.push("/editor")}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {t("createThought")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              className="bg-[#f9f9f9] shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col"
            >
              <p className="text-gray-800 mb-2 whitespace-pre-wrap flex-grow">
                {thought.content}
              </p>
              {/* {thought.image && (
                <img
                  src={thought.image}
                  alt="Thought image"
                  className="w-full h-auto rounded-md mb-2"
                />
              )} */}
              <small className="text-gray-500 self-end mt-2">
                {new Date(thought.timestamp).toLocaleString()}
              </small>
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => {
                /* Add publish functionality */
              }}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {t("publish")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
