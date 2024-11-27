"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getUserLogin, getThoughts, getThoughtsPublic, Thought } from "@/lib/githubApi";
import { Octokit } from "@octokit/rest";

interface HeaderProps {
  username?: string;
  iconUrl?: string;
}

const getRelativeTimeString = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
};

const Avatar = ({ src, alt, href }: { src: string; alt: string; href: string }) => (
  <Link href={href}>
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      className="rounded-full hover:opacity-90 transition-opacity"
    />
  </Link>
);

const UserInfo = ({ 
  displayName, 
  latestThought 
}: { 
  displayName: string;
  latestThought: Thought | null;
}) => (
  <div className="flex flex-col">
    <span className="font-medium text-gray-900 text-xl">{displayName}</span>
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-600 font-mono">
        {latestThought?.content ? (latestThought.content.length > 24 ? `${latestThought.content.substring(0, 24)} ...` : latestThought.content) : "No status"}
      </span>
      <span className="text-xs text-gray-400">•</span>
      <time className="text-xs text-gray-400" data-status-datetime="">
        {latestThought ? getRelativeTimeString(latestThought.timestamp) : ""}
      </time>
      {window.location.pathname !== '/thoughts' && (
        <>
          <span className="text-xs text-gray-400">•</span>
          <Link href="/thoughts" className="text-xs text-gray-400 hover:text-gray-600 underline">
            more
          </Link>
        </>
      )}
    </div>
  </div>
);

export default function Header({ username, iconUrl }: HeaderProps) {
  const { data: session, status } = useSession();
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("/icon.jpg");
  const [latestThought, setLatestThought] = useState<Thought | null>(null);

  useEffect(() => {
    const updateAvatarUrl = async () => {
      if (username) {
        setAvatarUrl(`https://github.com/${username}.png`);
      } else if (session?.accessToken) {
        const login = await getUserLogin(session.accessToken);
        setUserLogin(login);
        setAvatarUrl(`https://github.com/${login}.png`);
      }
    };
    updateAvatarUrl();
  }, [session, username]);

  useEffect(() => {
    if (iconUrl && iconUrl !== "/icon.jpg") {
      setAvatarUrl(iconUrl);
    }
  }, [iconUrl]);

  useEffect(() => {
    const fetchLatestThought = async () => {
      if (status === "loading") return;

      try {
        const octokit = new Octokit();
        const thoughts = session?.accessToken
          ? await getThoughts(session.accessToken)
          : username
          ? await getThoughtsPublic(octokit, username, "tinymind-blog")
          : [];
        
        if (thoughts.length > 0) {
          setLatestThought(thoughts[0]);
        }
      } catch (error) {
        console.error("Error fetching thoughts:", error);
      }
    };

    fetchLatestThought();
  }, [session, status, username]);

  const isOwnProfile = userLogin === username;
  const navigationPath = isOwnProfile ? "/" : username ? `/${username}` : "/";
  const displayName = username || userLogin || "Anonymous";

  return (
    <header className="top-0 left-0 right-0 py-6 bg-card z-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar 
              src={avatarUrl}
              alt="Blogger Avatar"
              href={navigationPath}
            />
            <UserInfo 
              displayName={displayName}
              latestThought={latestThought}
            />
          </div>
          <nav className="hidden">
            <Link href="/blog" className="text-gray-600 hover:text-gray-900">
              Blog
            </Link>
            <Link href="/thoughts" className="text-gray-600 hover:text-gray-900">
              Thoughts
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
