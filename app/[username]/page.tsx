import PublicBlogList from "@/components/PublicBlogList";

// Increase cache duration and add error boundary
export const revalidate = 300; // 5 minutes

export default async function PublicHomePage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username;

  try {
    // Use the cached API endpoint to avoid exposing GitHub token to clients
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

    const blogPosts = await response.json();

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
