import { Metadata } from "next";
import PublicBlogList from "@/components/PublicBlogList";
import { getPublicBlogPosts } from "@/lib/publicData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";
  const canonicalUrl = `${baseUrl}/${username}/blog`;

  return {
    title: `${username}'s Blog Posts - TinyMind`,
    description: `Read all blog posts by ${username} on TinyMind. Discover insights, tutorials, and thoughts shared through GitHub-synced content.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${username}'s Blog Posts`,
      description: `Read all blog posts by ${username} on TinyMind.`,
      url: canonicalUrl,
      siteName: "TinyMind",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${username}'s Blog Posts`,
      description: `Read all blog posts by ${username} on TinyMind.`,
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

// Increase cache duration and add error boundary
export const revalidate = 300; // 5 minutes instead of 60 seconds

export default async function PublicBlogListPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  try {
    const blogPosts = await getPublicBlogPosts(username);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <PublicBlogList posts={blogPosts} username={username} />
        </div>
      </div>
    );
  } catch (error: unknown) {
    console.error("Error fetching public data:", error);

    // Handle rate limiting specifically
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 403 &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("rate limit")
    ) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Temporarily Unavailable</h1>
            <p className="text-gray-600 mb-4">
              This blog is temporarily unavailable due to high traffic. Please
              try again in a few minutes.
            </p>
            <p className="text-sm text-gray-500">
              GitHub API rate limit exceeded. The content will be available
              again shortly.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Blog</h1>
          <p className="text-gray-600">
            Error loading public data. The user may not have a TinyMind Blog or
            the repository may be private.
          </p>
        </div>
      </div>
    );
  }
}
