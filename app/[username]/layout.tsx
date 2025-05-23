import Header from "@/components/Header";
import { Metadata } from "next";
import { getIconUrls } from "@/lib/githubApi";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { iconPath } = await getIconUrls(params.username);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tinymind.me";
  const canonicalUrl = `${baseUrl}/${params.username}`;

  return {
    title: `${params.username}'s TinyMind Blog`,
    description: `Explore ${params.username}'s blog posts and thoughts on TinyMind. Write and sync content with GitHub.`,
    manifest: `/api/manifest/${params.username}`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${params.username}'s TinyMind Blog`,
      description: `Explore ${params.username}'s blog posts and thoughts on TinyMind.`,
      url: canonicalUrl,
      siteName: "TinyMind",
      type: "profile",
      images: [
        {
          url: iconPath,
          width: 512,
          height: 512,
          alt: `${params.username}'s profile`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${params.username}'s TinyMind Blog`,
      description: `Explore ${params.username}'s blog posts and thoughts on TinyMind.`,
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
  params: { username: string };
}) {
  const { iconPath } = await getIconUrls(params.username);

  return (
    <>
      <Header username={params.username} iconUrl={iconPath} />
      <div className="pt-20 max-w-4xl mx-auto px-4 py-8">{children}</div>
    </>
  );
}
