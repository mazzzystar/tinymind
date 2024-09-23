"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Thought } from "@/lib/githubApi";
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
import Lightbox from "./Lightbox";
import { parseImagesFromMarkdown } from "@/components/Lightbox";
import Image from "next/image";

export default function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [error] = useState<string | null>(null);
  const [isLoading] = useState(true);
  const [thoughtToDelete, setThoughtToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("HomePage");
  const { toast } = useToast();

  useEffect(() => {
    if (thoughts.length > 0) {
      const allImages = thoughts.flatMap((thought) =>
        parseImagesFromMarkdown(thought.content)
      );
      setLightboxImages(allImages);
    }
  }, [thoughts]);

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
                  img: ({ src, alt }) => (
                    <Image
                      src={src || ""}
                      alt={alt || ""}
                      width={500}
                      height={300}
                      className="rounded-lg cursor-pointer"
                      onClick={() => {
                        const index = lightboxImages.indexOf(src || "");
                        if (index !== -1) {
                          setCurrentImageIndex(index);
                          setLightboxImage(src || "");
                        }
                      }}
                    />
                  ),
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
      {lightboxImage && lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          currentIndex={currentImageIndex}
          onClose={() => setLightboxImage(null)}
          onPrev={() =>
            setCurrentImageIndex(
              (prev) =>
                (prev - 1 + lightboxImages.length) % lightboxImages.length
            )
          }
          onNext={() =>
            setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length)
          }
        />
      )}
    </div>
  );
}
