"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { useTranslations } from "next-intl";

const GitHubSignInButton = () => {
  const t = useTranslations("HomePage");

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          {t("howItWorksTitle")}
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-base text-gray-600 md:w-full">
          <li>{t("howItWorksStep1")}</li>
          <li>{t("howItWorksStep2")}</li>
          <li>{t("howItWorksStep3")}</li>
          <li>{t("howItWorksStep4")}</li>
        </ol>
      </div>
      <div className="mt-6">
        <Button onClick={() => signIn("github")} className="mt-6">
          <Github className="mr-2 h-4 w-4" />
          {t("signInWithGitHub")}
        </Button>
      </div>
    </div>
  );
};

export default GitHubSignInButton;
