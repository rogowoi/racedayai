import Link from "next/link";
import { ArrowRight, Clock, BookOpen, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import type { ArticleContent, ArticleMeta } from "@/lib/content";

interface ArticleLayoutProps {
  article: ArticleContent;
  relatedArticles: (ArticleMeta & {
    title: string;
    readingTime: number;
    isPillar: boolean;
  })[];
  breadcrumbs: { label: string; href: string }[];
  categoryLabel: string;
}

export function ArticleLayout({
  article,
  relatedArticles,
  breadcrumbs,
  categoryLabel,
}: ArticleLayoutProps) {
  const formattedDate = new Date(article.meta.publishedDate).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumbs items={breadcrumbs} />

      <main className="flex-1">
        {/* Article Header */}
        <section className="pb-8 md:pb-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <p className="text-sm text-primary font-medium mb-3 uppercase tracking-wide">
              {categoryLabel}
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-tight mb-5">
              {article.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">RaceDayAI</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.readingTime} min read
              </span>
              <span>·</span>
              <time dateTime={article.meta.publishedDate}>{formattedDate}</time>
            </div>
          </div>
        </section>

        {/* Table of Contents (for longer articles) */}
        {article.headings.length > 3 && (
          <nav className="container mx-auto px-4 max-w-3xl pb-8">
            <div className="bg-muted/40 rounded-lg p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                In This Guide
              </h2>
              <ol className="space-y-1.5">
                {article.headings.map((heading, i) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <span className="text-xs text-muted-foreground/60 w-4">
                        {i + 1}.
                      </span>
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        )}

        {/* Article Body */}
        <article className="container mx-auto px-4 max-w-3xl pb-16">
          <div
            className="prose prose-gray dark:prose-invert max-w-none
              prose-headings:scroll-mt-20
              prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:mb-4
              prose-li:leading-relaxed
              prose-strong:text-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-table:text-sm
              prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2
              prose-td:px-4 prose-td:py-2
              prose-hr:my-8"
            dangerouslySetInnerHTML={{ __html: article.htmlContent }}
          />
        </article>

        {/* Related Guides */}
        {relatedArticles.length > 0 && (
          <section className="border-t bg-muted/20">
            <div className="container mx-auto px-4 max-w-3xl py-12">
              <h2 className="text-xl font-bold mb-6">Related Guides</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/${related.routePrefix}/${related.slug}`}
                    className="group block rounded-lg border bg-background p-5 hover:border-primary/50 transition-colors"
                  >
                    <h3 className="font-semibold group-hover:text-primary transition-colors mb-1.5 line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {related.readingTime} min read
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Build Your Personalized Race Plan
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Get segment-by-segment power targets, a nutrition timeline, and
              weather-adjusted strategy tailored to your fitness and your race
              course.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="h-13 text-base px-10 font-semibold"
              asChild
            >
              <Link href="/wizard">
                Create Free Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
