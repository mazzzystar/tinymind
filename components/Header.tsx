"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { usePathname, useSearchParams } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getUserLogin } from "@/lib/githubApi";

export default function Header({
  username,
  iconUrl,
}: {
  username?: string;
  iconUrl?: string;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("HomePage");
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("/icon.jpg");
  const [activeTab, setActiveTab] = useState<string>("thoughts");

  useEffect(() => {
    if (username) {
      setAvatarUrl(`https://github.com/${username}.png`);
    } else if (session?.accessToken) {
      getUserLogin(session.accessToken).then((login) => {
        setUserLogin(login);
        setAvatarUrl(`https://github.com/${login}.png`);
      });
    }
  }, [session, username]);

  const isUserPage = !!username;
  const isOwnProfile = userLogin === username;

  // Use iconUrl if provided (for cases where we have a custom icon)
  useEffect(() => {
    if (iconUrl && iconUrl !== "/icon.jpg") {
      setAvatarUrl(iconUrl);
    }
  }, [iconUrl]);

  // Determine the active tab based on the current pathname
  useEffect(() => {
    let newActiveTab: string;

    if (isUserPage) {
      // For user pages like /username/blog, /username/thoughts, etc.
      if (pathname.includes("/thoughts")) {
        newActiveTab = "thoughts";
      } else if (pathname.includes("/about")) {
        newActiveTab = "about";
      } else {
        // Default to blog for user pages (includes /username, /username/blog, /username/blog/[id])
        newActiveTab = "blog";
      }
    } else {
      // For regular pages like /blog, /thoughts, /blog/[id], etc.
      if (pathname.startsWith("/blog") || searchParams.get("type") === "blog") {
        newActiveTab = "blog";
      } else if (
        pathname.startsWith("/thoughts") ||
        pathname === "/" ||
        searchParams.get("type") === "thought"
      ) {
        newActiveTab = "thoughts";
      } else if (
        pathname.startsWith("/about") ||
        searchParams.get("type") === "about"
      ) {
        newActiveTab = "about";
      } else {
        // Default to thoughts for the main app
        newActiveTab = "thoughts";
      }
    }

    setActiveTab(newActiveTab);
  }, [pathname, searchParams, isUserPage]);

  return (
    <header className="fixed top-0 left-0 right-0 py-4 bg-card border-b border-gray-100 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link
            href={isOwnProfile ? "/" : username ? `/${username}` : "/"}
            className=""
          >
            <Image
              src={avatarUrl}
              alt="Home"
              width={32}
              height={32}
              className="rounded-full"
            />
          </Link>
          <div className="flex-grow flex justify-center">
            <div className="flex space-x-2 sm:space-x-4 w-full justify-center">
              <Button
                variant="ghost"
                className={`text-lg font-normal border-0 ${
                  activeTab === "blog" ? "text-black" : "text-gray-300"
                }`}
                asChild
              >
                <Link href={isUserPage ? `/${username}/blog` : "/blog"}>
                  {t("blog")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className={`text-lg font-normal border-0 ${
                  activeTab === "thoughts" ? "text-black" : "text-gray-300"
                }`}
                asChild
              >
                <Link href={isUserPage ? `/${username}/thoughts` : "/thoughts"}>
                  {t("thoughts")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className={`text-lg font-normal border-0 ${
                  activeTab === "about" ? "text-black" : "text-gray-300"
                }`}
                asChild
              >
                <Link href={isUserPage ? `/${username}/about` : "/about"}>
                  {t("about")}
                </Link>
              </Button>
            </div>
          </div>
          <Link
            href="https://github.com/mazzzystar/tinymind"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-gray-500"
          >
            <FaGithub size={24} />
          </Link>
        </div>
      </div>
    </header>
  );
}
