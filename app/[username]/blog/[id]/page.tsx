import { Metadata } from "next";
import { Octokit } from "@octokit/rest";
import { getBlogPostsPublic } from "@/lib/githubApi";
import BlogPostClient from "./BlogPostClient";

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
  return <BlogPostClient username={params.username} id={params.id} />;
}

export async function generateMetadata({
  params,
}: {
  params: { username: string; id: string };
}): Promise<Metadata> {
  const { username, id } = params;
  const octokit = new Octokit();

  try {
    const posts = await getBlogPostsPublic(octokit, username, "tinymind-blog");
    const post = posts.find((p) => p.id === decodeURIComponent(id));

    if (!post) {
      return {
        title: "Blog Post Not Found",
      };
    }

    const decodedTitle = decodeContent(post.title);
    const decodedContent = decodeContent(post.content);
    const contentWithoutFrontmatter = removeFrontmatter(decodedContent);

    // Extract the first few sentences (up to 200 characters) for the description
    const description =
      contentWithoutFrontmatter
        .split(". ")
        .slice(0, 3)
        .join(". ")
        .slice(0, 200) + "...";

    // Find the first image in the content
    const imageMatch = contentWithoutFrontmatter.match(/!\[.*?\]\((.*?)\)/);
    let imageUrl = imageMatch ? imageMatch[1] : "/public/icon.jpg";

    // If the image URL is relative, make it absolute
    if (imageUrl.startsWith("/")) {
      imageUrl = `${
        process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me"
      }${imageUrl}`;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";

    return {
      title: decodedTitle,
      description,
      openGraph: {
        title: decodedTitle,
        description,
        type: "article",
        publishedTime: post.date,
        authors: [username],
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: decodedTitle,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: decodedTitle,
        description,
        images: [imageUrl],
        creator: `@${username}`,
      },
      alternates: {
        canonical: `${baseUrl}/${username}/blog/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Error Loading Blog Post",
    };
  }
}
