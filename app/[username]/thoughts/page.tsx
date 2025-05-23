import { Metadata } from "next";
import { Octokit } from "@octokit/rest";
import { getThoughtsPublic } from "@/lib/githubApi";
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
  const octokit = new Octokit();
  const username = params.username;

  try {
    const thoughts = await getThoughtsPublic(
      octokit,
      username,
      "tinymind-blog"
    );

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PublicThoughtsList thoughts={thoughts} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching public thoughts:", error);
    return (
      <div>
        Error loading public thoughts. The user may not have a TinyMind Blog.
      </div>
    );
  }
}
