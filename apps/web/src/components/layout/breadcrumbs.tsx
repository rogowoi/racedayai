import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { generateBreadcrumbSchema, jsonLdScript } from "@/lib/schema";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Always include Home as first item
  const allItems = [{ label: "Home", href: "/" }, ...items];

  // Generate breadcrumb schema for SEO
  const breadcrumbSchema = generateBreadcrumbSchema(
    allItems.map((item) => ({
      name: item.label,
      url: `https://racedayai.com${item.href}`,
    }))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema)}
      />
      <nav
        aria-label="Breadcrumb"
        className="container mx-auto px-4 py-4 md:py-6"
      >
        <ol className="flex items-center gap-2 text-sm flex-wrap">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;

            return (
              <li key={item.href} className="flex items-center gap-2">
                {index === 0 ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                ) : isLast ? (
                  <span
                    className="font-medium text-foreground"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                )}

                {!isLast && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
