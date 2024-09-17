"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const Footer = () => {
  const { data: session } = useSession();

  if (!session || !session.user?.repoUrl) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-gray-100 py-2 text-center text-sm">
      Data stored in:{" "}
      <Link
        href={session.user.repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-500 hover:underline"
      >
        {session.user.repoUrl}
      </Link>
    </footer>
  );
};

export default Footer;
