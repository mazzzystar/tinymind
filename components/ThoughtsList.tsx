"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getThoughts, Thought } from "@/lib/githubApi";
import GitHubSignInButton from "./GitHubSignInButton";
import { useRouter } from "next/navigation";

export default function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

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
        <div className="flex justify-center mt-8">
          <button
            onClick={() => router.push("/editor")}
            className="text-gray-500 hover:text-black"
          >
            No thoughts yet, create one.
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              className="bg-[#f9f9f9] shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300"
            >
              <p className="text-gray-800 mb-2">{thought.content}</p>
              {/* {thought.image && (
                <img
                  src={thought.image}
                  alt="Thought image"
                  className="w-full h-auto rounded-md mb-2"
                />
              )} */}
              <small className="text-gray-500">
                {new Date(thought.timestamp).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
