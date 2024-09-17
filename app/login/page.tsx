"use client";

import { signIn } from "next-auth/react";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => signIn("github")}
            className="w-full"
            variant="outline"
          >
            <FaGithub className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
