import { Metadata } from "next";
import { Octokit } from "@octokit/rest";
import { getBlogPostsPublic } from "@/lib/githubApi";
import PublicBlogList from "@/components/PublicBlogList";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";
  const canonicalUrl = `${baseUrl}/${params.username}/blog`;

  return {
    title: `${params.username}'s Blog Posts - TinyMind`,
    description: `Read all blog posts by ${params.username} on TinyMind. Discover insights, tutorials, and thoughts shared through GitHub-synced content.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${params.username}'s Blog Posts`,
      description: `Read all blog posts by ${params.username} on TinyMind.`,
      url: canonicalUrl,
      siteName: "TinyMind",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${params.username}'s Blog Posts`,
      description: `Read all blog posts by ${params.username} on TinyMind.`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function PublicBlogListPage({
  params,
}: {
  params: { username: string };
}) {
  const octokit = new Octokit();
  const username = params.username;

  try {
    const blogPosts = await getBlogPostsPublic(
      octokit,
      username,
      "tinymind-blog"
    );

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <PublicBlogList posts={blogPosts} username={username} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching public data:", error);
    return (
      <div>
        Error loading public data. The user may not have a TinyMind Blog.
      </div>
    );
  }
}
