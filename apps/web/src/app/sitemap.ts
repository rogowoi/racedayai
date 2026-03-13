import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { getArticleSummaries } from '@/lib/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://racedayai.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/wizard`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // Content pages (resources + races)
  const articles = getArticleSummaries();
  const contentPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date('2026-03-13'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `${baseUrl}/${article.routePrefix}/${article.slug}`,
      lastModified: new Date(article.modifiedDate),
      changeFrequency: 'monthly' as const,
      priority: article.isPillar ? 0.9 : 0.7,
    })),
  ];

  try {
    // Dynamic plan pages (only public/shared plans)
    const plans = await prisma.racePlan.findMany({
      where: {
        shareToken: { not: null },
      },
      select: {
        shareToken: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Limit to most recent 1000 plans
    });

    const planPages: MetadataRoute.Sitemap = plans.map(plan => ({
      url: `${baseUrl}/plan/${plan.shareToken}`,
      lastModified: plan.createdAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticPages, ...contentPages, ...planPages];
  } catch (error) {
    // If database query fails, return at least static + content pages
    console.error('Error generating sitemap:', error);
    return [...staticPages, ...contentPages];
  }
}
