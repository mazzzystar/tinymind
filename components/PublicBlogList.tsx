"use client";

import { useState, useEffect } from "react";
import { BlogPost } from "@/lib/githubApi";
import Link from "next/link";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
}

export default function PublicBlogList({
  posts,
  username,
}: {
  posts: BlogPost[];
  username: string;
}) {
  const [sortedPosts, setSortedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const sorted = [...posts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setSortedPosts(sorted);
  }, [posts]);

  const groupedPosts = sortedPosts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<number, BlogPost[]>);

  const sortedYears = Object.keys(groupedPosts).sort(
    (a, b) => Number(b) - Number(a)
  );

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
                  href={`/${username}/blog/${post.id}`}
                  className="text-gray-700 hover:text-gray-400 transition-colors duration-200"
                >
                  {post.title}
                </Link>
                <span className="flex-grow border-b border-dotted border-gray-300 mx-2" />
                <span className="text-sm text-gray-400 font-light whitespace-nowrap">
                  {formatDate(post.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
