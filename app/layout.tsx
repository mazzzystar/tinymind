import type { Metadata } from "next";
import { gowun_wodum } from "@/components/ui/font";
import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "../components/SessionProvider";
import Script from "next/script";
import Footer from "@/components/Footer";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/toaster";
import Head from "next/head";

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
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon.jpg" />
      </Head>
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
      <Script id="register-sw">
        {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  console.log('Service Worker registration successful with scope: ', registration.scope);
                },
                function(err) {
                  console.log('Service Worker registration failed: ', err);
                }
              );
            });
          }
        `}
      </Script>

      <body className={gowun_wodum.className}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <Header />
            <main className="pt-20 pb-20">{children}</main>
            <Footer />
            <CreateButton messages={messages} />
            <Toaster />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
