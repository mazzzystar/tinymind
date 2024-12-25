"use client";

import { BlogPost } from "@/lib/githubApi";
import Link from "next/link";

export const BlogCard = ({ post }: { post: BlogPost }) => (
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
      href={`/blog/${encodeURIComponent(post.id)}`}
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
