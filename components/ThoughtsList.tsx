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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiOutlineEllipsis } from "react-icons/ai";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import "katex/dist/katex.min.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { formatTimestamp } from "@/utils/dateFormatting";
import { transformGithubImageUrl } from "@/lib/urlUtils";
import React, { HTMLAttributes } from "react";

// Interface for code component props if not already defined elsewhere
interface CodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [thoughtToDelete, setThoughtToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<
    Record<string, boolean>
  >({});
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("HomePage");
  const { toast } = useToast();

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

  const handleDeleteThought = async (id: string) => {
    if (!session?.accessToken) {
      console.error("No access token available");
      return;
    }

    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteThought",
          id: id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete thought");
      }

      setThoughts(thoughts.filter((thought) => thought.id !== id));

      toast({
        title: t("success"),
        description: t("thoughtDeleted"),
        duration: 3000,
      });
    } catch (error) {
      console.error("Error deleting thought:", error);
      toast({
        title: t("error"),
        description: t("thoughtDeleteFailed"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setThoughtToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-gray-700 hover:text-black float-right bg-transparent"
                  >
                    <AiOutlineEllipsis className="h-5 w-5" />{" "}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() => {
                      setThoughtToDelete(thought.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    {t("delete")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      router.push(`/editor?type=thought&id=${thought.id}`);
                    }}
                  >
                    {t("edit")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("confirmDelete")}</DialogTitle>
                    <DialogDescription>{t("undoAction")}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">{t("cancel")}</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (thoughtToDelete) {
                          handleDeleteThought(thoughtToDelete);
                        }
                        setIsDeleteDialogOpen(false);
                      }}
                    >
                      {t("delete")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code: ({
                    inline,
                    className,
                    children,
                    ...props
                  }: CodeProps) => {
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
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      className="text-gray-400 no-underline hover:text-gray-600 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <div className="pl-4 border-l-4 border-gray-200 text-gray-400">
                      {children}
                    </div>
                  ),
                  img: (props) => {
                    const transformedSrc = transformGithubImageUrl(props.src);
                    return (
                      <img
                        {...props}
                        src={transformedSrc}
                        alt={props.alt || "image"}
                      />
                    );
                  },
                }}
              >
                {getDisplayContent(thought)}
              </ReactMarkdown>

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
              {formatTimestamp(thought.timestamp)}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
