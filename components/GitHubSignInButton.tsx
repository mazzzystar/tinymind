"use client";

import { signIn } from "next-auth/react";
import { FaGithub } from "react-icons/fa";

import { Button } from "@/components/ui/button"; // Add this import

const GitHubSignInButton = () => {
  return (
    <Button onClick={() => signIn("github")} className="w-full">
      <FaGithub className="mr-2 h-4 w-4" /> {/* Changed Github to FaGithub */}
      Sign in with GitHub
    </Button>
  );
};

export default GitHubSignInButton;
