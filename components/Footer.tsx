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
    <footer className="fixed bottom-2 left-0 w-full py-2 text-center text-sm">
      {t("dataStoredIn")}{" "}
      <Link
        href={`https://github.com/${owner}/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-500 hover:underline"
      >
        {`${owner}/${repo}`}
      </Link>
    </footer>
  );
};

export default Footer;
