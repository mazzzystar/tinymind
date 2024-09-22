"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { CgImage } from "react-icons/cg";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getThoughts, uploadImage } from "@/lib/githubApi";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { useDropzone } from "react-dropzone";

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  return content.replace(frontmatterRegex, "");
}

export default function Editor({
  defaultType = "thought",
}: {
  defaultType?: "thought" | "blog";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState(
    (searchParams.get("type") as "thought" | "blog") || defaultType
  );
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const t = useTranslations("HomePage");
  const { data: session } = useSession();
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const { toast } = useToast();
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const fetchThought = useCallback(
    async (id: string) => {
      if (!session?.accessToken) return;
      try {
        const thoughts = await getThoughts(session.accessToken);
        const thought = thoughts.find((t) => t.id === id);
        if (thought) {
          setContent(thought.content);
        }
      } catch (error) {
        console.error("Error fetching thought:", error);
      }
    },
    [session?.accessToken]
  );

  const fetchBlogPost = useCallback(
    async (id: string) => {
      if (!session?.accessToken) return;
      try {
        const response = await fetch(`/api/github?action=getBlogPost&id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch blog post");
        }
        const blogPost = await response.json();
        setTitle(blogPost.title);
        setContent(removeFrontmatter(blogPost.content));
        setEditingThoughtId(id);
      } catch (error) {
        console.error("Error fetching blog post:", error);
      }
    },
    [session?.accessToken]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("type", type);
    router.push(`/editor?${params.toString()}`);

    const id = searchParams.get("id");

    if (id) {
      setEditingThoughtId(id);
      if (type === "blog") {
        fetchBlogPost(id);
      } else if (type === "thought") {
        fetchThought(id);
      }
    }
  }, [type, router, searchParams, fetchThought, fetchBlogPost]);

  const handleTypeChange = (value: "blog" | "thought") => {
    setType(value);
    if (value === "blog") {
      setEditingThoughtId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action:
            type === "blog"
              ? editingThoughtId
                ? "updateBlogPost"
                : "createBlogPost"
              : editingThoughtId
              ? "updateThought"
              : "createThought",
          id: editingThoughtId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(t("failedPublish"));
      }

      setIsSuccess(true);
      toast({
        title: t("success"),
        description: editingThoughtId
          ? `${type === "blog" ? t("blogPostUpdated") : t("thoughtUpdated")}`
          : `${type === "blog" ? t("blogPostCreated") : t("thoughtCreated")}`,
        duration: 3000,
      });
      setTimeout(() => {
        if (type === "blog") {
          router.push("/blog");
        } else {
          router.push("/thoughts");
        }
      }, 2000);
    } catch (error) {
      console.error("Error publishing:", error);
      toast({
        title: t("error"),
        description: t("failedPublish"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!session?.accessToken) {
        toast({
          title: t("error"),
          description: t("notAuthenticated"),
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      setIsImageUploading(true);
      try {
        const imageUrl = await uploadImage(file, session.accessToken);
        const imageMarkdown = `![${file.name}](${imageUrl})`;

        if (cursorPosition !== null) {
          const newContent =
            content.slice(0, cursorPosition) +
            imageMarkdown +
            content.slice(cursorPosition);
          setContent(newContent);
        } else {
          setContent((prevContent) => prevContent + "\n\n" + imageMarkdown);
        }

        toast({
          title: t("success"),
          description: t("imageUploaded"),
          duration: 3000,
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: t("error"),
          description: t("imageUploadFailed"),
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsImageUploading(false);
      }
    },
    [session?.accessToken, cursorPosition, content, toast, t]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (file.type.startsWith("image/")) {
          await handleImageUpload(file);
        } else {
          toast({
            title: t("error"),
            description: t("onlyImagesAllowed"),
            variant: "default",
            duration: 3000,
          });
        }
      }
    },
    [handleImageUpload, toast, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/*": [],
    },
  });

  return (
    <Card className="max-w-2xl mx-auto shadow-md border border-gray-100 relative">
      {(isLoading || isImageUploading) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )}
      <CardHeader className="border-b border-gray-100 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex flex-col items-start">
            {type === "blog" ? t("createBlogPost") : t("createThought")}
            <span className="mt-2 text-xs font-normal text-gray-400">
              {t("publicContentWarning")}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup
            value={type}
            onValueChange={handleTypeChange}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="blog"
                id="blog"
                className={type === "blog" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="blog" className="text-sm">
                {t("blog")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="thought"
                id="thought"
                className={type === "thought" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="thought" className="text-sm">
                {t("thoughts")}
              </Label>
            </div>
          </RadioGroup>

          {type === "blog" && (
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("enterTitle")}
              required
              className="border-gray-200 focus:border-gray-300 focus:ring-gray-300"
              disabled={isLoading || isImageUploading}
            />
          )}

          <div className="border rounded-md relative" {...getRootProps()}>
            <input {...getInputProps()} />
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className={`text-sm px-4 py-2 ${
                  !isPreview ? "bg-gray-100" : ""
                }`}
                disabled={isLoading || isImageUploading}
              >
                {t("write")}
              </button>
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className={`text-sm px-4 py-2 ${
                  isPreview ? "bg-gray-100 border-b-2 border-black" : ""
                }`}
                disabled={isLoading || isImageUploading}
              >
                {t("preview")}
              </button>
              <label
                htmlFor="image-upload"
                className="text-sm px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                <CgImage className="h-5 w-5" />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                  disabled={isLoading || isImageUploading}
                />
              </label>
            </div>
            {isPreview ? (
              <div className="p-4 prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={(e) =>
                  setCursorPosition(e.currentTarget.selectionStart)
                }
                placeholder={t("writeContent")}
                className="min-h-[300px] border-0 focus:ring-0"
                required
                disabled={isLoading || isImageUploading}
              />
            )}
            {isDragActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                <p className="text-lg font-semibold">{t("dropImageHere")}</p>
              </div>
            )}
          </div>

          {isSuccess && (
            <div className="text-xs font-normal text-gray-400 text-center m-2">
              {t("successPublished")}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isLoading || isImageUploading}
              className="px-12 py-5 bg-black hover:bg-gray-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("publishing")}
                </>
              ) : (
                t("publish")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
