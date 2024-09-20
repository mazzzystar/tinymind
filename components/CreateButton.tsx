"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";

export default function CreateButton({ messages }: { messages: any }) {
  const pathname = usePathname();

  const isThoughtsPage = pathname === "/" || pathname === "/thoughts";
  const isBlogPage = pathname === "/blog";
  const createLink = isBlogPage ? "/editor?type=blog" : "/editor?type=thought";

  return (
    <Link
      href={createLink}
      className="fixed bottom-9 right-9 p-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg z-20 flex items-center justify-center"
    >
      <FiPlus className="w-6 h-6" />
      <span className="sr-only">
        {isThoughtsPage
          ? (messages.createThought as string)
          : (messages.createBlogPost as string)}
      </span>
    </Link>
  );
}
