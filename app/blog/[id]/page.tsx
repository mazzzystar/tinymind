import BlogPostClient from "./BlogPostClient";

export default async function BlogPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BlogPostClient id={id} />;
}
