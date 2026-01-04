"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useEffect, useState, useMemo } from "react";
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
  const [avatarUrl, setAvatarUrl] = useState<string>("/icon.jpg");

  useEffect(() => {
    if (session?.accessToken) {
      getUserLogin(session.accessToken).then((login) => {
        if (propUsername) {
          setAvatarUrl(`https://github.com/${propUsername}.png`);
        } else if (login) {
          setAvatarUrl(`https://github.com/${login}.png`);
        } else {
          setAvatarUrl("/icon.jpg");
        }
      });
    } else if (propUsername) {
      setAvatarUrl(`https://github.com/${propUsername}.png`);
    } else {
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

  // Memoize active tab calculation
  const activeTab = useMemo(() => {
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
  }, [isOnPublicProfilePage, pathname, propUsername]);

  // Memoize navigation URLs
  const navUrls = useMemo(() => {
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
  }, [isOnPublicProfilePage, propUsername]);

  const shouldShowTabs = isLoggedIn || isOnPublicProfilePage;

  return (
    <header className="fixed top-0 left-0 right-0 py-4 bg-card border-b border-gray-100 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link
            href={isOnPublicProfilePage ? `/${propUsername}` : "/"}
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
          {shouldShowTabs && (
            <div className="flex-grow flex justify-center">
              <div className="flex space-x-2 sm:space-x-4 w-full justify-center">
                <Link
                  href={navUrls.blog}
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
          <div className="flex items-center space-x-3">
            <Link
              href="https://chromewebstore.google.com/detail/tinymind-quick-thoughts/gpfojneflmaoemniapdcgikfehpiocag"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              title="Get Chrome Extension"
            >
              <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" fill="#fff"/>
                <path fill="#4CAF50" d="M24,4C16.5,4,10.1,8.5,7.2,15h16.8c4.4,0,8,3.6,8,8l6.7,11.6C42.8,30.4,44,27.4,44,24C44,12.9,35.1,4,24,4z"/>
                <path fill="#F44336" d="M7.2,15C5.1,18.5,4,22.1,4,24c0,11.1,8.9,20,20,20c3.4,0,6.6-0.8,9.3-2.3L26.5,31C22,31,18.3,28,17.2,24L7.2,15z"/>
                <path fill="#FFC107" d="M44,24c0-3.4-0.8-6.6-2.3-9.3l-10,17.4c1.1,1.9,1.3,4.3,0.4,6.5l6.7,11.6C43,44.6,44,42.3,44,40C44,35.6,44,29.6,44,24z"/>
                <path fill="#2196F3" d="M24,4c-7.5,0-13.9,4.5-16.8,11l10,17.4c1.1-1.9,3.2-3.4,5.8-3.4h13.3c0.5-1.6,0.7-3.3,0.7-5C37,12.9,31.1,4,24,4z"/>
                <circle cx="24" cy="24" r="8" fill="#fff"/>
                <circle cx="24" cy="24" r="6" fill="#2196F3"/>
              </svg>
            </Link>
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
      </div>
    </header>
  );
}
