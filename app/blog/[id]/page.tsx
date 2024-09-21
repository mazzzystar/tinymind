"use client";

import { getBlogPost } from "@/lib/githubApi";
import type { BlogPost } from "@/lib/githubApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiOutlineEllipsis } from "react-icons/ai";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

function decodeContent(content: string): string {
  try {
    return decodeURIComponent(content);
  } catch (error) {
    console.error("Error decoding content:", error);
    return content;
  }
}

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  return content.replace(frontmatterRegex, "");
}

export default function BlogPost({ params }: { params: { id: string } }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const { data: session } = useSession();
  const t = useTranslations("HomePage");

  useEffect(() => {
    const fetchPost = async () => {
      if (status === "loading") return;
      if (!session || !session.accessToken) {
        router.push("/api/auth/signin");
        return;
      }
      try {
        const fetchedPost = await getBlogPost(params.id, session.accessToken);
        if (fetchedPost) {
          setPost(fetchedPost);
        } else {
          throw new Error("Failed to fetch blog post");
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
        toast({
          title: t("error"),
          description: "Failed to fetch blog post",
          variant: "destructive",
        });
      }
    };
    fetchPost();
  }, [params.id, router, session, status, toast]);

  const handleDeleteBlogPost = async () => {
    if (!session?.accessToken) {
      console.error("No access token available");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteBlogPost",
          id: params.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete blog post");
      }

      toast({
        title: t("success"),
        description: t("blogPostDeleted"),
        duration: 3000,
      });

      setTimeout(() => {
        router.push("/blog");
      }, 500);
    } catch (error) {
      console.error("Error deleting blog post:", error);
      toast({
        title: t("error"),
        description: t("blogPostDeleteFailed"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (status === "loading" || !post) {
    return (
      <div className="flex justify-center items-center h-screen">
        <AiOutlineLoading3Quarters className="animate-spin text-4xl" />
      </div>
    );
  }

  const decodedTitle = decodeContent(post.title);
  const decodedContent = decodeContent(post.content);
  const contentWithoutFrontmatter = removeFrontmatter(decodedContent);

  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader className="flex justify-between items-start">
        <div>
          <CardTitle className="text-3xl font-bold">{decodedTitle}</CardTitle>
          <p className="text-sm text-gray-500">
            {format(new Date(post.date), "MMMM d, yyyy")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <AiOutlineEllipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => router.push(`/editor?type=blog&id=${params.id}`)}
            >
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete")}</DialogTitle>
            <DialogDescription>{t("undoAction")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBlogPost}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
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
                    style={tomorrow as { [key: string]: React.CSSProperties }}
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
              a: ({ ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {contentWithoutFrontmatter}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
