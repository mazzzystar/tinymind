"use client";

import React, { HTMLAttributes } from "react";
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
import { Tooltip } from "react-tooltip";
import { GrInfo } from "react-icons/gr";
import "katex/dist/katex.min.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import SyntaxHighlighter from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { transformGithubImageUrl } from "@/lib/urlUtils";

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  return content.replace(frontmatterRegex, "");
}

interface CodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function Editor({
  defaultType = "thought",
}: {
  defaultType?: "thought" | "blog" | "about";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState(
    (searchParams.get("type") as "thought" | "blog" | "about") || defaultType
  );
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
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

  const fetchAboutPage = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      setIsContentLoading(true);
      const response = await fetch(`/api/github?action=getAboutPage`);
      if (!response.ok) {
        throw new Error("Failed to fetch about page");
      }
      const aboutPage = await response.json();
      if (aboutPage) {
        setContent(aboutPage.content);
      }
    } catch (error) {
      console.error("Error fetching about page:", error);
    } finally {
      setIsContentLoading(false);
    }
  }, [session?.accessToken]);

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
    } else if (type === "about") {
      fetchAboutPage();
    }
  }, [type, router, searchParams, fetchThought, fetchBlogPost, fetchAboutPage]);

  const handleTypeChange = (value: "blog" | "thought" | "about") => {
    setType(value);
    setTitle("");
    setContent("");
    if (value === "blog") {
      setEditingThoughtId(null);
    } else if (value === "about") {
      setEditingThoughtId(null);
      fetchAboutPage();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    try {
      let action: string;

      if (type === "blog") {
        action = editingThoughtId ? "updateBlogPost" : "createBlogPost";
      } else if (type === "thought") {
        action = editingThoughtId ? "updateThought" : "createThought";
      } else {
        // For about page
        const aboutPageResponse = await fetch(
          `/api/github?action=getAboutPage`
        );
        const aboutPageExists =
          aboutPageResponse.ok && (await aboutPageResponse.json());
        action = aboutPageExists ? "updateAboutPage" : "createAboutPage";
      }

      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          id: editingThoughtId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(t("failedPublish"));
      }

      const responseData = await response.json();

      setIsSuccess(true);
      toast({
        title: t("success"),
        description:
          type === "about"
            ? t("aboutPageUpdated")
            : editingThoughtId
            ? `${type === "blog" ? t("blogPostUpdated") : t("thoughtUpdated")}`
            : `${type === "blog" ? t("blogPostCreated") : t("thoughtCreated")}`,
        duration: 3000,
      });

      setTimeout(() => {
        if (type === "blog") {
          if (responseData.newId) {
            router.push(`/blog/${responseData.newId}`);
          } else {
            router.push("/blog");
          }
        } else if (type === "about") {
          router.push("/about");
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

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!session?.accessToken) {
        toast({
          title: t("error"),
          description: t("notAuthenticated"),
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      const items = Array.from(e.clipboardData.items);
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          setIsImageUploading(true);

          try {
            const file = item.getAsFile();
            if (!file) continue;

            const imageUrl = await uploadImage(file, session.accessToken);
            const imageMarkdown = `![${
              file.name || "Pasted image"
            }](${imageUrl})`;

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
            console.error("Error uploading pasted image:", error);
            toast({
              title: t("error"),
              description: t("imageUploadFailed"),
              variant: "destructive",
              duration: 3000,
            });
          } finally {
            setIsImageUploading(false);
          }
        }
      }
    },
    [session?.accessToken, cursorPosition, content, toast, t]
  );

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
            {type === "blog"
              ? t("createBlogPost")
              : type === "about"
              ? t("editAboutPage")
              : t("createThought")}
            <span className="mt-2 text-xs font-normal text-gray-400 flex items-center">
              <span className="text-gray-400">{t("publicContentWarning")}</span>
              <GrInfo
                className="m-1 cursor-pointer text-black"
                data-tooltip-id="public-content-tooltip"
              />
              <Tooltip id="public-content-tooltip" place="top">
                {t("publicContentTooltip")}
              </Tooltip>
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isContentLoading && type === "about" ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">
              {t("loadingContent") || "Loading content..."}
            </span>
          </div>
        ) : (
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="about"
                  id="about"
                  className={type === "about" ? "text-white bg-black" : ""}
                />
                <Label htmlFor="about" className="text-sm">
                  {t("about")}
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
                        const transformedSrc = transformGithubImageUrl(
                          props.src
                        );
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
                  onPaste={handlePaste}
                  placeholder={
                    type === "about"
                      ? t("writeAboutPageContent") ||
                        "Write about yourself in Markdown..."
                      : t("writeContent")
                  }
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
                {type === "about"
                  ? t("aboutPageSuccessMessage") ||
                    "About page published successfully"
                  : t("successPublished")}
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
        )}
      </CardContent>
    </Card>
  );
}
