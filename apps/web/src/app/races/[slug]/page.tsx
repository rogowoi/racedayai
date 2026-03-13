import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticle, getAllSlugs, getArticleSummaries } from "@/lib/content";
import { ArticleLayout } from "@/components/content/article-layout";
import { generateArticleSchema, jsonLdScript } from "@/lib/schema";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllSlugs("races").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  return {
    title: article.meta.metaTitle,
    description: article.meta.metaDescription,
    keywords: [article.meta.targetKeyword, ...article.meta.secondaryKeywords],
    openGraph: {
      title: article.meta.metaTitle,
      description: article.meta.metaDescription,
      url: `https://racedayai.com/races/${slug}`,
      type: "article",
      publishedTime: article.meta.publishedDate,
      modifiedTime: article.meta.modifiedDate,
      authors: ["RaceDayAI"],
    },
    twitter: {
      card: "summary_large_image",
      title: article.meta.metaTitle,
      description: article.meta.metaDescription,
    },
    alternates: {
      canonical: `https://racedayai.com/races/${slug}`,
    },
  };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const relatedArticles = getArticleSummaries().filter(
    (a) => a.slug !== slug
  );

  const articleSchema = generateArticleSchema({
    title: article.title,
    description: article.meta.metaDescription,
    publishedDate: article.meta.publishedDate,
    modifiedDate: article.meta.modifiedDate,
    authorName: "RaceDayAI",
    imageUrl: "https://racedayai.com/og-image.png",
    url: `https://racedayai.com/races/${slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(articleSchema)}
      />
      <ArticleLayout
        article={article}
        relatedArticles={relatedArticles}
        breadcrumbs={[
          { label: "Races", href: "/resources" },
          { label: article.title, href: `/races/${slug}` },
        ]}
        categoryLabel="Race Guide"
      />
    </>
  );
}
