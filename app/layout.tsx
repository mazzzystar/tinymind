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
import CreateButton from "@/components/CreateButton";
import { getIconUrls } from "@/lib/githubApi";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const session = await getServerSession(authOptions);

  const title =
    t("title") ||
    "TinyMind - Write and sync your blog posts & thoughts with one-click GitHub sign-in";
  const description =
    t("description") ||
    "Write and preserve your blogs, thoughts, and notes effortlessly. Sign in with GitHub to automatically sync your content to your own repository, ensuring your ideas are safely stored as long as GitHub exists.";

  const { iconPath } = await getIconPaths(session?.accessToken);

  return {
    title,
    description,
    manifest: "/manifest.json",
    openGraph: {
      title,
      description,
      images: [{ url: iconPath, width: 512, height: 512, alt: "App Logo" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [iconPath],
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
  const session = await getServerSession(authOptions);

  const { iconPath } = await getIconPaths(session?.accessToken);

  return (
    <html lang={locale}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href={iconPath} />
      </Head>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-1MF16MH92D"
      />
      <Script id="google-analytics">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-1MF16MH92D');
      `}</Script>
      <body className={gowun_wodum.className}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <Header iconUrl={iconPath} />
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

async function getIconPaths(accessToken: string | undefined) {
  const defaultIconPath = "/icon.jpg";
  const defaultAppleTouchIconPath = "/icon-144.jpg";

  if (accessToken) {
    const iconUrls = await getIconUrls(accessToken);
    return iconUrls;
  }

  return {
    iconPath: defaultIconPath,
    appleTouchIconPath: defaultAppleTouchIconPath,
  };
}
