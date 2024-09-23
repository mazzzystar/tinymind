import Header from "@/components/Header";

export default function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  return (
    <>
      <Header username={params.username} />
      <div className="pt-20 max-w-4xl mx-auto px-4 py-8">{children}</div>
    </>
  );
}
