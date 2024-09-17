"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react"; // Import Loader2 icon

export default function Editor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("thought");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: type === "blog" ? "createBlogPost" : "createThought",
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish");
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000); // Redirect after 2 seconds
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          Create {type === "blog" ? "Blog Post" : "Thought"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup
            defaultValue={type}
            onValueChange={(value) => setType(value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="blog"
                id="blog"
                className={type === "blog" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="blog">Blog</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="thought"
                id="thought"
                className={type === "thought" ? "text-white bg-black" : ""}
              />
              <Label htmlFor="thought">Thought</Label>
            </div>
          </RadioGroup>

          {type === "blog" && (
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
            />
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your content here (Markdown supported)"
            className="min-h-[200px]"
            required
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish"
            )}
          </Button>

          {isSuccess && (
            <div className="text-green-500 text-center mt-4">
              🎉Successfully published! Redirecting...
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
