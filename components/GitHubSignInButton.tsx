"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button"; // Add this import
import { Github } from "lucide-react";

const GitHubSignInButton = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">How it works:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>
            We create a public &quot;tinymind-blog&quot; repo in your GitHub.
          </li>
          <li>
            Your new blog & thoughts will be automatically committed to this
            repo.
          </li>
          <li>Your data is stored only on GitHub, independent of this site.</li>
        </ol>
      </div>
      <div className="mt-6">
        <Button onClick={() => signIn("github")} className="mt-6">
          <Github className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </Button>
      </div>
    </div>
  );
};

export default GitHubSignInButton;
