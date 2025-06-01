"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getUserLogin } from "@/lib/githubApi";

export default function Header({
  username: propUsername,
  iconUrl,
}: {
  username?: string;
  iconUrl?: string;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations("HomePage");
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("/icon.jpg");

  console.log("[Header] Initial props:", { propUsername, iconUrl });
  console.log("[Header] Session data:", session, "Status:", status);

  useEffect(() => {
    if (session?.accessToken) {
      getUserLogin(session.accessToken).then((login) => {
        console.log("[Header] Fetched userLogin:", login);
        setUserLogin(login);
        if (propUsername) {
          setAvatarUrl(`https://github.com/${propUsername}.png`);
        } else if (login) {
          setAvatarUrl(`https://github.com/${login}.png`);
        } else {
          setAvatarUrl("/icon.jpg");
        }
      });
    } else if (propUsername) {
      setUserLogin(null);
      setAvatarUrl(`https://github.com/${propUsername}.png`);
    } else {
      setUserLogin(null);
      setAvatarUrl("/icon.jpg");
    }
  }, [session, propUsername]);

  useEffect(() => {
    if (iconUrl && iconUrl !== "/icon.jpg") {
      setAvatarUrl(iconUrl);
    }
  }, [iconUrl]);

  const isLoggedIn = !!session?.user && status === "authenticated";
  const isOnPublicProfilePage = !!propUsername;
  const isViewingOwnPublicProfile = isLoggedIn && propUsername === userLogin;
  const isOnPrivatePages = !propUsername;

  console.log("[Header] Page context:", {
    pathname,
    isLoggedIn,
    isOnPublicProfilePage,
    isViewingOwnPublicProfile,
    isOnPrivatePages,
    userLogin,
    propUsername,
    sessionStatus: status,
  });

  const getActiveTab = () => {
    if (isOnPublicProfilePage) {
      if (pathname === `/${propUsername}/thoughts`) return "thoughts";
      if (pathname === `/${propUsername}/about`) return "about";
      if (
        pathname === `/${propUsername}` ||
        pathname === `/${propUsername}/blog`
      )
        return "blog";
      return "blog";
    } else {
      if (pathname === "/blog" || pathname.startsWith("/blog/")) return "blog";
      if (pathname === "/about") return "about";
      if (pathname === "/" || pathname === "/thoughts") return "thoughts";
      return "thoughts";
    }
  };

  const getNavUrls = () => {
    if (isOnPublicProfilePage) {
      return {
        blog: `/${propUsername}/blog`,
        thoughts: `/${propUsername}/thoughts`,
        about: `/${propUsername}/about`,
      };
    } else {
      return {
        blog: "/blog",
        thoughts: "/thoughts",
        about: "/about",
      };
    }
  };

  const activeTab = getActiveTab();
  const navUrls = getNavUrls();

  console.log("[Header] Navigation state:", { activeTab, navUrls });

  const handleTabClick = (tabName: string) => {
    const targetUrl = navUrls[tabName as keyof typeof navUrls];
    console.log(
      `[Header] Clicked tab: ${tabName}, current pathname: ${pathname}, target URL: ${targetUrl}`
    );

    if (
      !isOnPublicProfilePage &&
      !isLoggedIn &&
      (tabName === "blog" || tabName === "about")
    ) {
      console.warn(
        `[Header] Warning: Navigating to ${tabName} but user is not authenticated. This may show login page.`
      );
    }
  };

  const shouldShowTabs = isLoggedIn || isOnPublicProfilePage;

  return (
    <header className="fixed top-0 left-0 right-0 py-4 bg-card border-b border-gray-100 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link
            href={isOnPublicProfilePage ? `/${propUsername}` : "/"}
            className=""
            onClick={() => console.log("[Header] Clicked Home/Avatar link")}
          >
            <Image
              src={avatarUrl}
              alt="Home"
              width={32}
              height={32}
              className="rounded-full"
            />
          </Link>
          {shouldShowTabs && (
            <div className="flex-grow flex justify-center">
              <div className="flex space-x-2 sm:space-x-4 w-full justify-center">
                <Link
                  href={navUrls.blog}
                  onClick={() => handleTabClick("blog")}
                >
                  <Button
                    variant="ghost"
                    className={`text-lg font-normal border-0 transition-colors duration-150 ${
                      activeTab === "blog" ? "text-black" : "text-gray-300"
                    }`}
                  >
                    {t("blog")}
                  </Button>
                </Link>
                <Link
                  href={navUrls.thoughts}
                  onClick={() => handleTabClick("thoughts")}
                >
                  <Button
                    variant="ghost"
                    className={`text-lg font-normal border-0 transition-colors duration-150 ${
                      activeTab === "thoughts" ? "text-black" : "text-gray-300"
                    }`}
                  >
                    {t("thoughts")}
                  </Button>
                </Link>
                <Link
                  href={navUrls.about}
                  onClick={() => handleTabClick("about")}
                >
                  <Button
                    variant="ghost"
                    className={`text-lg font-normal border-0 transition-colors duration-150 ${
                      activeTab === "about" ? "text-black" : "text-gray-300"
                    }`}
                  >
                    {t("about")}
                  </Button>
                </Link>
              </div>
            </div>
          )}
          <Link
            href="https://github.com/mazzzystar/tinymind"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-gray-500"
            onClick={() => console.log("[Header] Clicked GitHub link")}
          >
            <FaGithub size={24} />
          </Link>
        </div>
      </div>
    </header>
  );
}
