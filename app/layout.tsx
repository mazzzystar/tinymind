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
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title:
    "TinyMind - Write and sync your blog posts & thoughts with one-click GitHub sign-in",
  description:
    "Write and preserve your blogs, thoughts, and notes effortlessly. Sign in with GitHub to automatically sync your content to your own repository, ensuring your ideas are safely stored as long as GitHub exists.",
  openGraph: {
    title: "TinyMind - Write and sync your blog posts & memos with GitHub",
    description:
      "Write and preserve your blogs, thoughts, and notes effortlessly. Sync with GitHub for safe storage.",
    images: [
      {
        url: "/icon.jpg",
        width: 512,
        height: 512,
        alt: "TinyMind Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "TinyMind - Write and sync your blog posts & thoughts with one-click GitHub sign-in",
    description:
      "Write and preserve your blogs, thoughts, and notes effortlessly. Sync with GitHub for safe storage.",
    images: ["/icon.jpg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
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
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <Header />
            <main className="pt-10">{children}</main>
            <Footer />
            <Button
              size="icon"
              className="fixed bottom-8 right-8 rounded-full shadow-lg z-20"
              asChild
            >
              <Link href="/editor?type=thoughts">
                <FiPlus className="w-6 h-6" />
                <span className="sr-only">
                  {messages.createNewThought as string}
                </span>
              </Link>
            </Button>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
