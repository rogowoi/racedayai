import Link from "next/link";
import { CookiePreferencesButton } from "@/components/layout/cookie-preferences-button";

export function Footer() {
  return (
    <footer className="border-t py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/wizard" className="hover:text-primary inline-block py-2">
                  Create Plan
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary inline-block py-2">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-primary inline-block py-2">
                  Features
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary inline-block py-2">
                  About
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary inline-block py-2">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary inline-block py-2">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary inline-block py-2">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary inline-block py-2">
                  Terms of Service
                </Link>
              </li>
              <li>
                <CookiePreferencesButton />
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-primary inline-block py-2">
                  Log In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary inline-block py-2">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} RaceDayAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
