import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Activity, Calendar, Map, CheckCircle2 } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Activity className="h-6 w-6 text-primary" />
          <span>RaceDayAI</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="#features"
            className="transition-colors hover:text-primary"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-primary"
          >
            How it Works
          </Link>
          <Link
            href="#pricing"
            className="transition-colors hover:text-primary"
          >
            Pricing
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium hover:text-primary"
          >
            Log in
          </Link>
          <Button asChild>
            <Link href="/wizard">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col gap-6 pt-10">
              <div className="flex flex-col gap-4 text-base font-medium">
                <Link
                  href="#features"
                  className="flex items-center gap-2 py-2 hover:text-primary"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Features
                </Link>
                <Link
                  href="#how-it-works"
                  className="flex items-center gap-2 py-2 hover:text-primary"
                >
                  <Map className="h-5 w-5" />
                  How it Works
                </Link>
                <Link
                  href="#pricing"
                  className="flex items-center gap-2 py-2 hover:text-primary"
                >
                  <Calendar className="h-5 w-5" />
                  Pricing
                </Link>
              </div>

              <div className="flex flex-col gap-3 mt-auto">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/wizard">Get Your Race Plan</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
