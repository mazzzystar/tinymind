"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/lib/githubApi";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiOutlineEllipsis } from "react-icons/ai";

function decodeTitle(title: string): string {
  try {
    return decodeURIComponent(title);
  } catch {
    return title;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const t = useTranslations("HomePage");
  const [blogPosts, setBlogPosts] = useState(posts);

  const handleDeleteBlogPost = async (id: string) => {
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteBlogPost",
          id: id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete blog post");
      }

      // Remove the deleted blog post from the state
      setBlogPosts(blogPosts.filter((post) => post.id !== id));
    } catch (error) {
      console.error("Error deleting blog post:", error);
      alert("Failed to delete blog post");
    }
  };

  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const groupedPosts = sortedPosts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<number, BlogPost[]>);

  const sortedYears = Object.keys(groupedPosts).sort(
    (a, b) => Number(b) - Number(a)
  );

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center mt-8 space-y-4">
        <p className="text-gray-500">{t("noBlogPostsYet")}</p>
        <Button
          onClick={() => router.push("/editor?type=blog")}
          className="bg-black hover:bg-gray-800 text-white"
        >
          {t("createBlogPost")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {sortedYears.map((year) => (
        <div key={year} className="mb-16">
          <h2 className="text-2xl font-serif font-light text-gray-400 mb-6">
            {year}
          </h2>
          <ul className="space-y-4">
            {groupedPosts[Number(year)].map((post) => (
              <li key={post.id} className="flex items-center">
                <Link
                  href={`/blog/${post.id.replace(".md", "")}`}
                  className="text-gray-700 hover:text-gray-400 transition-colors duration-200"
                >
                  {decodeTitle(post.title)}
                </Link>
                <span className="flex-grow border-b border-dotted border-gray-300 mx-2" />{" "}
                <span className="text-sm text-gray-400 font-light whitespace-nowrap">
                  {formatDate(post.date)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:text-black bg-transparent ml-2"
                    >
                      <AiOutlineEllipsis className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleDeleteBlogPost(post.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        router.push(`/editor?type=blog&id=${post.id}`);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
