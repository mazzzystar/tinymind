"use client";

import { useState, useEffect } from "react";
import { BlogPost } from "@/lib/githubApi";
import { BlogPostContent } from "@/components/BlogPostContent";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

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

export default function BlogPostClient({
  username,
  id,
}: {
  username: string;
  id: string;
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // Use the authenticated API endpoint instead of direct GitHub API
        const response = await fetch(`/api/public-blog/${username}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const posts = await response.json();
        const foundPost = posts.find(
          (p: BlogPost) => p.id === decodeURIComponent(id)
        );
        setPost(foundPost || null);
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [username, id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <AiOutlineLoading3Quarters className="animate-spin text-4xl" />
      </div>
    );
  }

  if (!post) {
    return <div>Blog post not found</div>;
  }

  const decodedContent = decodeContent(post.content);
  const contentWithoutFrontmatter = removeFrontmatter(decodedContent);

  return (
    <BlogPostContent
      title={post.title}
      date={post.date}
      content={contentWithoutFrontmatter}
    />
  );
}
