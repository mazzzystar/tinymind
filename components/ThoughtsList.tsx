"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getThoughts, Thought } from "@/lib/githubApi";

export default function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();

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
      } catch (error) {
        console.error("Error fetching thoughts:", error);
        if (
          error instanceof Error &&
          (error.message.includes("Bad credentials") ||
            error.message.includes("Failed to get authenticated user"))
        ) {
          setError("authentication_failed");
        } else {
          setError("Failed to fetch thoughts");
        }
      }
    }

    fetchThoughts();
  }, [session, status]);

  if (status === "unauthenticated" || error === "authentication_failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            How it works:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>
              We create a public &quot;tinymind-blog&quot; repo in your GitHub.
            </li>
            <li>
              Your new blog & thoughts will be automatically committed to this
              repo.
            </li>
            <li>
              Your data is stored only on GitHub, independent of this site.
            </li>
          </ol>
        </div>
        <Button onClick={() => signIn("github")} className="mt-6">
          <Github className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </Button>
      </div>
    );
  }

  if (error && error !== "authentication_failed") {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* <h2 className="text-2xl font-bold mb-4 text-gray-800">Thoughts</h2>
      <p className="text-sm text-gray-600 mb-4">
        Total thoughts: {thoughts.length}
      </p> */}
      <div className="space-y-4">
        {thoughts.map((thought) => (
          <div
            key={thought.id}
            className="bg-[#f5f5f5] shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300"
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
    </div>
  );
}
