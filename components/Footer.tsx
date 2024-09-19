"use client";

import { getUserLogin } from "@/lib/githubApi";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const Footer = () => {
  const { data: session } = useSession();
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const t = useTranslations("HomePage");

  useEffect(() => {
    if (session?.accessToken) {
      getUserLogin(session.accessToken).then(setUserLogin);
    }
  }, [session]);

  if (!session || !session.user?.name || !userLogin) {
    return null;
  }

  const owner = userLogin;
  const repo = "tinymind-blog";

  return (
    <footer className="fixed bottom-0 left-0 w-full border-t border-gray-200 bg-white py-3 text-center text-sm">
      <div className="container mx-auto px-4 text-gray-400 hover:text-black transition-colors duration-200">
        {t("dataStoredIn")}
        <Link
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {`${owner}/${repo}`}
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
