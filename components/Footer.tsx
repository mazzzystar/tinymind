"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const Footer = () => {
  const { data: session } = useSession();

  if (!session || !session.user?.name) {
    return null;
  }

  return (
    <footer className="fixed bottom-2 left-0 w-full py-2 text-center text-sm">
      Data stored in:{" "}
      <Link
        href={"https://github.com/" + session.user?.name + "/tinymind-blog"}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-500 hover:underline"
      >
        {session.user?.name + "/tinymind-blog"}
      </Link>
    </footer>
  );
};

export default Footer;
