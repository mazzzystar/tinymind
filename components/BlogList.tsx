"use client";

import { useRouter } from "next/navigation";
import { BlogPost } from "@/lib/githubApi";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { BlogCard } from "./PublicBlogList";

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const t = useTranslations("HomePage");

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center mt-8 space-y-4">
        <p className="text-gray-500">{t("noBlogPostsYet")}</p>
        <Button
          onClick={() => router.push("/editor?type=blog")}
          className="bg-black hover:bg-gray-800 text-white"
        >
          {t("createBlogPost")}
        </Button>
      </div>
    );
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
        {
          sorted
            .filter((_, index) => index % 2 === 0)
            .map((post) => <BlogCard key={post.id} post={post} />)
        }
        </div>
        <div className="flex flex-col gap-2">
        { 
          sorted
            .filter((_, index) => index % 2 !== 0)
            .map((post) => <BlogCard key={post.id} post={post} />)
        }
        </div>
      </div>
    </div>
  );
}
