import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { BeforeAfter } from "@/components/home/before-after";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <BeforeAfter />
      </main>
      <footer className="border-t py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RaceDayAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
