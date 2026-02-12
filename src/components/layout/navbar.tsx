import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Zap,
  ArrowRight,
  TrendingUp,
  Map,
  DollarSign,
  LayoutDashboard,
} from "lucide-react";
import { auth } from "@/auth";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>
            RaceDay<span className="text-primary">AI</span>
          </span>
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
          {session && (
            <Link
              href="/dashboard"
              className="transition-colors hover:text-primary flex items-center gap-1.5"
            >
              My Races
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Log in
            </Link>
          )}
          <Button className="font-semibold" asChild>
            <Link href="/wizard">
              Build My Plan
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
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
          <SheetContent side="right" className="w-[85vw] max-w-[400px]">
            <div className="flex flex-col h-full gap-6 pt-10">
              <div className="flex flex-col gap-4 text-base font-medium">
                {session && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 py-2 text-primary font-semibold"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    My Dashboard
                  </Link>
                )}
                <Link
                  href="#features"
                  className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                >
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Features
                </Link>
                <Link
                  href="#how-it-works"
                  className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                >
                  <Map className="h-5 w-5 text-muted-foreground" />
                  How it Works
                </Link>
                <Link
                  href="#pricing"
                  className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                >
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  Pricing
                </Link>
              </div>

              <div className="flex flex-col gap-3 mt-auto">
                {!session ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      asChild
                    >
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button className="w-full font-semibold" size="lg" asChild>
                      <Link href="/wizard">
                        Build My Race Plan
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button className="w-full font-semibold" size="lg" asChild>
                    <Link href="/wizard">
                      Build New Plan
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
