import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "../components/SessionProvider";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import Script from "next/script";
import Footer from "@/components/Footer";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  const title =
    t("title") ||
    "TinyMind - Write and sync your blog posts & thoughts with one-click GitHub sign-in";
  const description =
    t("description") ||
    "Write and preserve your blogs, thoughts, and notes effortlessly. Sign in with GitHub to automatically sync your content to your own repository, ensuring your ideas are safely stored as long as GitHub exists.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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
      title,
      description,
      images: ["/icon.jpg"],
    },
  };
}

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
            <main className="pt-20 pb-20">{children}</main>
            <Footer />
            <Link
              href="/editor?type=thoughts"
              className="fixed bottom-9 right-9 p-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg z-20 flex items-center justify-center"
            >
              <FiPlus className="w-6 h-6" />
              <span className="sr-only">
                {messages.createNewThought as string}
              </span>
            </Link>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
