import { Metadata } from "next";
import BlogPostClient from "./BlogPostClient";

function decodeContent(content: string): string {
  try {
    return decodeURIComponent(content);
  } catch (error) {
    console.error("Error decoding content:", error);
    // Return the original content if decoding fails
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

  try {
    // Use the secure API endpoint instead of direct GitHub API call
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/public-blog/${username}`,
      {
        next: { revalidate: 300 }, // 5 minutes cache
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const posts: Array<{
      id: string;
      title: string;
      content: string;
      date: string;
    }> = await response.json();

    const post = posts.find((p) => p.id === decodeContent(id));

    if (!post) {
      return {
        title: "Blog Post Not Found",
      };
    }

    const decodedContent = decodeContent(post.content);
    const contentWithoutFrontmatter = removeFrontmatter(decodedContent);

    const description =
      contentWithoutFrontmatter
        .split(". ")
        .slice(0, 3)
        .join(". ")
        .slice(0, 200) + "...";

    // Find the first image in the content
    const imageMatch = contentWithoutFrontmatter.match(/!\[.*?\]\((.*?)\)/);
    let imageUrl = imageMatch ? imageMatch[1] : "/icon.jpg";

    // If the image URL is relative, make it absolute
    if (imageUrl.startsWith("/")) {
      imageUrl = `${
        process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me"
      }${imageUrl}`;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";

    return {
      title: post.title,
      description,
      openGraph: {
        title: post.title,
        description,
        type: "article",
        publishedTime: post.date,
        authors: [username],
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
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
