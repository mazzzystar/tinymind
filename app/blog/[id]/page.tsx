"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BlogPostContent } from "@/components/BlogPostContent";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiOutlineEllipsis, AiOutlineLoading3Quarters } from "react-icons/ai";
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
import type { BlogPost } from "@/lib/githubApi";
import GitHubSignInButton from "@/components/GitHubSignInButton";

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
  const { data: session, status } = useSession();
  const t = useTranslations("HomePage");

  useEffect(() => {
    const fetchPost = async () => {
      if (!session || !session.accessToken) {
        return <GitHubSignInButton />;
      }

      try {
        const response = await fetch(
          `/api/github?action=getBlogPost&id=${encodeURIComponent(params.id)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch blog post");
        }
        const fetchedPost = await response.json();
        setPost(fetchedPost);
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
  }, [params.id, router, session, status, toast, t]);

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

  const headerContent = (
    <>
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
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBlogPost}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <BlogPostContent
      title={decodedTitle}
      date={post.date}
      content={contentWithoutFrontmatter}
      headerContent={headerContent}
    />
  );
}
