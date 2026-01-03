"use client";

import { useMemo, memo } from "react";
import { BlogPost } from "@/lib/githubApi";
import Link from "next/link";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
}

function PublicBlogListComponent({
  posts,
  username,
}: {
  posts: BlogPost[];
  username: string;
}) {
  // Use useMemo instead of useEffect+useState for sorting
  const sortedPosts = useMemo(() =>
    [...posts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ), [posts]);

  // Show message if no posts
  if (posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-500">No blog posts yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            {username} hasn&apos;t published any blog posts.
          </p>
        </div>
      </div>
    );
  }

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
                  href={`/${username}/blog/${encodeURIComponent(post.id)}`}
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

export default memo(PublicBlogListComponent);
