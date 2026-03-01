import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  Menu,
  Zap,
  ArrowRight,
  TrendingUp,
  Map,
  DollarSign,
  LayoutDashboard,
  User,
  Settings,
  CreditCard,
  LogOut,
  Shield,
} from "lucide-react";
import { auth } from "@/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/actions/auth-actions";

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
            href="/#features"
            className="transition-colors hover:text-primary"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="transition-colors hover:text-primary"
          >
            How it Works
          </Link>
          <Link
            href="/#pricing"
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
            <>
              <Button className="font-semibold" asChild>
                <Link href="/wizard">
                  Build My Plan
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings#billing" className="cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  {session.user?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={logout} className="w-full">
                      <button type="submit" className="flex w-full items-center cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Sign Up
              </Link>
              <Button className="font-semibold" asChild>
                <Link href="/wizard">
                  Build My Plan
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-[400px] p-6">
            <div className="flex flex-col h-full gap-4 pt-4">
              {session && (
                <div className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 text-base font-medium">
                {session && (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 py-2 text-primary font-semibold"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        My Dashboard
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                      >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        Settings
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/dashboard/settings#billing"
                        className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                      >
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        Billing
                      </Link>
                    </SheetClose>
                    {session.user?.isAdmin && (
                      <SheetClose asChild>
                        <Link
                          href="/admin/users"
                          className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                        >
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          Admin
                        </Link>
                      </SheetClose>
                    )}
                    <div className="h-px bg-border my-2" />
                  </>
                )}
                <SheetClose asChild>
                  <Link
                    href="/#features"
                    className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                  >
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    Features
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/#how-it-works"
                    className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                  >
                    <Map className="h-5 w-5 text-muted-foreground" />
                    How it Works
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/#pricing"
                    className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
                  >
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Pricing
                  </Link>
                </SheetClose>
              </div>

              <div className="flex flex-col gap-3 mt-auto">
                {!session ? (
                  <>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        asChild
                      >
                        <Link href="/login">Log in</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        asChild
                      >
                        <Link href="/signup">Sign Up</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="w-full font-semibold" size="lg" asChild>
                        <Link href="/wizard">
                          Build My Race Plan
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button className="w-full font-semibold" size="lg" asChild>
                        <Link href="/wizard">
                          Build New Plan
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                      </Button>
                    </SheetClose>
                    <form action={logout} className="w-full">
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-center"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
