import { Metadata } from "next";
import { getIconUrls } from "@/lib/githubApi";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { iconPath } = await getIconUrls(params.username);

  return {
    manifest: `/api/manifest/${params.username}`,
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
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
    </>
  );
}
