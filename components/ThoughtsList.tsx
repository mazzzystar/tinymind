"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getThoughts, Thought } from "@/lib/githubApi";
import GitHubSignInButton from "./GitHubSignInButton";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("HomePage");

  useEffect(() => {
    async function fetchThoughts() {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        setError("Please log in to view thoughts");
        setIsLoading(false);
        return;
      }
      if (!session?.accessToken) {
        setError("Access token not available");
        setIsLoading(false);
        return;
      }

      try {
        const fetchedThoughts = await getThoughts(session.accessToken);
        setThoughts(fetchedThoughts);
        setError(null);
      } catch (error) {
        console.error("Error fetching thoughts:", error);
        if (
          error instanceof Error &&
          (error.message.includes("Bad credentials") ||
            error.message.includes("Failed to get authenticated user"))
        ) {
          setError("authentication_failed");
        } else {
          setThoughts([]);
        }
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center mt-8 space-y-4">
        <p className="text-gray-500">{t("readingFromGithub")}</p>
      </div>
    );
  }

  if (thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center mt-8 space-y-4">
        <p className="text-gray-500">{t("noThoughtsYet")}</p>
        <Button
          onClick={() => router.push("/editor?type=thought")}
          className="bg-black hover:bg-gray-800 text-white"
        >
          {t("createThought")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4">
        {thoughts.map((thought) => (
          <div
            key={thought.id}
            className="bg-[#f9f9f9] shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col"
          >
            <div className="text-gray-800 mb-2 prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
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
                        style={
                          tomorrow as { [key: string]: React.CSSProperties }
                        }
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
                }}
              >
                {thought.content}
              </ReactMarkdown>
            </div>
            <small className="text-gray-500 self-end mt-2">
              {new Date(thought.timestamp).toLocaleString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
