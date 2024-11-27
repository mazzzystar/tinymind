"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

const GitHubSignInButton = () => {
  return (
    <Button 
      onClick={() => signIn("github")} 
      className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
    >
      <Github className="h-5 w-5" />
    </Button>
  );
};

export default GitHubSignInButton;
