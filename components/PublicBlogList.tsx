import { BlogPost } from "@/lib/githubApi";
import Link from "next/link";

export default function PublicBlogList({
  posts,
  username,
}: {
  posts: BlogPost[];
  username: string;
}) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="border-b pb-4">
          <Link
            href={`/${username}/blog/${post.id}`}
            className="text-xl font-semibold hover:underline"
          >
            {post.title}
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(post.date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
