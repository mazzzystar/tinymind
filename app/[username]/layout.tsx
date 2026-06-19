import Header from "@/components/Header";
import { Metadata } from "next";
import { getIconUrls } from "@/lib/githubApi";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const { iconPath } = await getIconUrls(username);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";
  const canonicalUrl = `${baseUrl}/${username}`;

  return {
    title: `${username}'s TinyMind Blog`,
    description: `Explore ${username}'s blog posts and thoughts on TinyMind. Write and sync content with GitHub.`,
    manifest: `/api/manifest/${username}`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${username}'s TinyMind Blog`,
      description: `Explore ${username}'s blog posts and thoughts on TinyMind.`,
      url: canonicalUrl,
      siteName: "TinyMind",
      type: "profile",
      images: [
        {
          url: iconPath,
          width: 512,
          height: 512,
          alt: `${username}'s profile`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${username}'s TinyMind Blog`,
      description: `Explore ${username}'s blog posts and thoughts on TinyMind.`,
      images: [iconPath],
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
    icons: [
      {
        url: iconPath,
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { iconPath } = await getIconUrls(username);

  return (
    <>
      <Header username={username} iconUrl={iconPath} />
      <div className="pt-20 max-w-4xl mx-auto px-4 py-8">{children}</div>
    </>
  );
}
