"use client";

import Link from "next/link";
import { BlogPost } from "@/lib/githubApi";

function decodeTitle(title: string): string {
  try {
    return decodeURIComponent(title);
  } catch {
    return title;
  }
}

function extractContentPreview(content: string): string {
  const contentWithoutFrontmatter = content
    .replace(/^---[\s\S]*?---/, "")
    .trim();
  return (
    contentWithoutFrontmatter.slice(0, 150) +
    (contentWithoutFrontmatter.length > 150 ? "..." : "")
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "/")
    .replace(",", "");
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {sortedPosts.length === 0 ? (
        <p className="text-gray-600 italic">No blog posts found.</p>
      ) : (
        <ul className="space-y-6">
          {sortedPosts.map((post) => (
            <li
              key={post.id}
              className="border-b border-gray-200 pb-4 last:border-b-0"
            >
              <Link
                href={`/blog/${post.id.replace(".md", "")}`}
                className="group block"
              >
                <h2 className="text-xl font-semibold text-gray-800 group-hover:text-emerald-500 transition-colors duration-200">
                  {decodeTitle(post.title)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(post.date)}
                </p>
                <p className="text-gray-600 mt-2 line-clamp-2">
                  {extractContentPreview(post.content)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
