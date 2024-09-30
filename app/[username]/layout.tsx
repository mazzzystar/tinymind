import Header from "@/components/Header";
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
