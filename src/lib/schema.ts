/**
 * JSON-LD Schema.org helpers for SEO
 * These structured data schemas help search engines and AI assistants
 * better understand and display our content
 */

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'RaceDayAI',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered race execution coach for triathletes. Get personalized race-day plans with pacing, nutrition, and weather adjustments.',
    url: 'https://racedayai.com',
    offers: {
      '@type': 'Offer',
      price: '4.99',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      description: 'Per race plan',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    author: {
      '@type': 'Organization',
      name: 'RaceDayAI',
    },
  };
}

export interface ArticleSchemaProps {
  title: string;
  description: string;
  publishedDate: string;
  modifiedDate?: string;
  authorName: string;
  imageUrl: string;
  url: string;
}

export function generateArticleSchema(article: ArticleSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.imageUrl,
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate || article.publishedDate,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'RaceDayAI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://racedayai.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface RacePlanSchemaProps {
  raceName: string;
  raceDate: string;
  location: string;
  distanceCategory: string;
  targetFinishTime?: string;
  shareUrl: string;
}

export function generateRacePlanSchema(plan: RacePlanSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: plan.raceName,
    startDate: plan.raceDate,
    location: {
      '@type': 'Place',
      name: plan.location,
    },
    sport: 'Triathlon',
    eventStatus: 'https://schema.org/EventScheduled',
    offers: {
      '@type': 'Offer',
      url: plan.shareUrl,
      price: '4.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    description: `AI-generated race execution plan for ${plan.raceName}: ${plan.distanceCategory} triathlon with optimized pacing, nutrition, and weather adjustments.`,
  };
}

export interface ProductSchemaProps {
  name: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
}

export function generateProductSchema(product: ProductSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
    },
  };
}

/**
 * Helper function to safely stringify and embed JSON-LD in HTML
 */
export function jsonLdScript(data: object) {
  return {
    __html: JSON.stringify(data),
  };
}
