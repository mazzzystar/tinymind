"use client";

import { useState, useEffect } from "react";
import { BlogPost } from "@/lib/githubApi";
import Link from "next/link";

export const BlogCard = ({ post, username }: { post: BlogPost; username: string }) => (
  <div
    role="listitem"
    className="nr-scroll-animation bg-light rounded-lg relative overflow-hidden aspect-[4/3] md:aspect-[3/2]"
    style={{
      backgroundImage: `url(${post.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
    <Link
      href={`/${username}/blog/${encodeURIComponent(post.id)}`}
      className="large-load medium-load small-loads relative z-10 flex flex-col justify-end p-6"
      aria-label={post.title}
    >
      <div className="space-y-2">
        <h3 className="text-white font-semibold text-xl lg:text-2xl leading-tight">
          {post.title}
        </h3>

        <p className="text-white text-sm font-light">
          {formatDate(post.date)}
        </p>
      </div>
    </Link>
  </div>
);

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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
        {
          sortedPosts
            .filter((_, index) => index % 2 === 0)
            .map((post) => <BlogCard key={post.id} post={post} username={username} />)
        }
        </div>
        <div className="flex flex-col gap-2">
        { 
          sortedPosts
            .filter((_, index) => index % 2 !== 0)
            .map((post) => <BlogCard key={post.id} post={post} username={username} />)
        }
        </div>
      </div>
    </div>
  );
}
