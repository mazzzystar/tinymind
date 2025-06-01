import { Metadata } from "next";
import PublicThoughtsList from "@/components/PublicThoughtsList";

// Add this to disable static page generation
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";
  const canonicalUrl = `${baseUrl}/${params.username}/thoughts`;

  return {
    title: `${params.username}'s Thoughts - TinyMind`,
    description: `Explore quick thoughts and ideas by ${params.username} on TinyMind. Short-form content synced with GitHub.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${params.username}'s Thoughts`,
      description: `Explore quick thoughts and ideas by ${params.username} on TinyMind.`,
      url: canonicalUrl,
      siteName: "TinyMind",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${params.username}'s Thoughts`,
      description: `Explore quick thoughts and ideas by ${params.username} on TinyMind.`,
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

export default async function PublicThoughtsPage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username;

  try {
    // Use the authenticated API endpoint instead of direct GitHub API
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/public/${username}`,
      {
        next: { revalidate: 300 }, // 5 minutes cache
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const thoughts = data.thoughts || [];

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PublicThoughtsList thoughts={thoughts} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching public thoughts:", error);
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Thoughts</h1>
          <p className="text-gray-600">
            Error loading thoughts. The user may not have a TinyMind Blog or the
            repository may be private.
          </p>
        </div>
      </div>
    );
  }
}
