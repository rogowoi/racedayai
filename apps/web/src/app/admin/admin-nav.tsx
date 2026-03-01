"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, Users, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/funnel", label: "Funnel", icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-6 h-14">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Admin</span>
          </div>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-colors",
                  pathname === item.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
