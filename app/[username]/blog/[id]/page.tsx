"use client";

import { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
import { BlogPost, getBlogPostsPublic } from "@/lib/githubApi";
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

export default function PublicBlogPost({
  params,
}: {
  params: { username: string; id: string };
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { username, id } = params;

  useEffect(() => {
    const fetchPost = async () => {
      const octokit = new Octokit();
      try {
        const posts = await getBlogPostsPublic(
          octokit,
          username,
          "tinymind-blog"
        );
        const foundPost = posts.find((p) => p.id === decodeURIComponent(id));
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

  const decodedTitle = decodeContent(post.title);
  const decodedContent = decodeContent(post.content);
  const contentWithoutFrontmatter = removeFrontmatter(decodedContent);

  return (
    <BlogPostContent
      title={decodedTitle}
      date={post.date}
      content={contentWithoutFrontmatter}
    />
  );
}
