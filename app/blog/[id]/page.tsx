import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getBlogPost } from "@/lib/githubApi";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

function decodeContent(content: string): string {
  return decodeURIComponent(escape(atob(content)));
}

export default async function BlogPost({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="pt-6">
          <p className="mb-4">Please sign in to view this post</p>
          <Link
            href="/api/auth/signin"
            className="text-blue-500 hover:underline"
          >
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  const post = await getBlogPost(params.id, session.accessToken as string);

  if (!post) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="pt-6">
          <p>Post not found</p>
        </CardContent>
      </Card>
    );
  }

  console.log("Original title:", post.title);
  console.log("Original content:", post.content);

  const decodedTitle = decodeContent(post.title);
  const decodedContent = decodeContent(post.content);

  console.log("Decoded title:", decodedTitle);
  console.log("Decoded content:", decodedContent);

  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">{decodedTitle}</CardTitle>
        <p className="text-sm text-gray-500">
          {format(new Date(post.date), "MMMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert">
          <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              a: ({ ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {decodedContent}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
