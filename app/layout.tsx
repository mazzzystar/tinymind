import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "../components/SessionProvider";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Script from "next/script";
import Footer from "@/components/Footer";
import { useSession } from "next-auth/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TinyMind - Write and sync your blog & memo data with GitHub",
  description:
    "Create a GitHub account and write blogs, thoughts, and notes using this website. Your data will be automatically saved in a GitHub repository, which means your data will never be lost as long as GitHub exists.p",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <html lang="en">
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-1MF16MH92D"
      ></Script>
      <Script id="google-analytics">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-1MF16MH92D');`}
      </Script>

      <body className={inter.className}>
        <SessionProvider>
          <Header />
          <main className="pt-20">{children}</main>
          {session && session.accessToken && <Footer />}
          <Button
            size="icon"
            className="fixed bottom-8 right-8 rounded-full shadow-lg z-20"
            asChild
          >
            <Link href="/editor?type=thoughts">
              <FiPlus className="w-6 h-6" />
              <span className="sr-only">Create new thought</span>
            </Link>
          </Button>
        </SessionProvider>
      </body>
    </html>
  );
}
