import ThoughtsList from "@/components/ThoughtsList";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow py-8 pt-10 sm:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ThoughtsList />
        </div>
      </main>
    </div>
  );
}
