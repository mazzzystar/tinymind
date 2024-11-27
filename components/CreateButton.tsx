"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { AbstractIntlMessages } from "next-intl";
import { useSession } from "next-auth/react";
import GitHubSignInButton from "./GitHubSignInButton";

export default function CreateButton({
  messages,
}: {
  messages: AbstractIntlMessages;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isThoughtsPage = pathname === "/" || pathname === "/thoughts";
  const isBlogPage = pathname === "/blog";
  const createLink = isBlogPage ? "/editor?type=blog" : "/editor?type=thought";

  if (!session) {
    return (
      <div className="fixed bottom-9 right-9 z-20">
        <GitHubSignInButton />
      </div>
    );
  }

  return (
    <Link
      href={createLink}
      className="fixed bottom-9 right-9 p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg z-20 flex items-center justify-center"
    >
      <FiPlus className="w-6 h-6" />
      <span className="sr-only">
        {isThoughtsPage
          ? (messages.createNewThought as string)
          : (messages.createNewBlogPost as string)}
      </span>
    </Link>
  );
}
