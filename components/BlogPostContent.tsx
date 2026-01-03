import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface BlogPostContentProps {
  title: string;
  date: string;
  content: string;
  headerContent?: React.ReactNode;
}

function BlogPostContentComponent({
  title,
  date,
  content,
  headerContent,
}: BlogPostContentProps) {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader className="flex justify-between items-start">
        <div>
          <CardTitle className="text-3xl font-bold">{title}</CardTitle>
          <p className="text-sm text-gray-500">
            {format(new Date(date), "MMMM d, yyyy")}
          </p>
        </div>
        {headerContent}
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none dark:prose-invert">
          <MarkdownRenderer content={content} />
        </div>
      </CardContent>
    </Card>
  );
}

export const BlogPostContent = memo(BlogPostContentComponent);
