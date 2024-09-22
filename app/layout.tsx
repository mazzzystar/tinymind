import type { Metadata } from "next";
import { gowun_wodum } from "@/components/ui/font";
// import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "../components/SessionProvider";
import Script from "next/script";
import Footer from "@/components/Footer";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/toaster";

// const inter = Inter({
//   subsets: ["latin"],
//   weight: ["400"],
// });

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

import CreateButton from "@/components/CreateButton";

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

      <body className={gowun_wodum.className}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <Header />
            <main className="pt-20 pb-20">{children}</main>
            <Footer />
            <CreateButton messages={messages} />
            <Toaster /> {/* Ensure Toaster is included here */}
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
      <link rel="manifest" href="manifest.json" />
    </html>
  );
}
