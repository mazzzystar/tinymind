"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

async function fetchCurrentUsername(): Promise<string | null> {
  const response = await fetch("/api/github?action=getUserLogin");
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { username?: string };
  return data.username ?? null;
}

const Footer = () => {
  const { data: session } = useSession();
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const t = useTranslations("HomePage");

  useEffect(() => {
    let cancelled = false;

    if (session?.accessToken) {
      fetchCurrentUsername().then((login) => {
        if (!cancelled) {
          setUserLogin(login);
        }
      });
    } else {
      setUserLogin(null);
    }

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session || !session.user?.name || !userLogin) {
    return null;
  }

  const owner = userLogin;
  const repo = "tinymind-blog";

  return (
    <footer className="fixed bottom-0 left-0 w-full border-t border-gray-200 bg-white py-3 text-center text-sm">
      <div className="container mx-auto px-4 text-gray-400">
        <Link
          href={`/${owner}`}
          className="hover:text-black transition-colors duration-200 mr-4"
        >
          {t("myHomepage")}
        </Link>
        |
        <Link
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-black transition-colors duration-200 ml-4"
        >
          {t("dataStoredOnGithub")}
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
