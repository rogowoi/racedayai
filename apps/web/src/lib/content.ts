import fs from "fs";
import path from "path";
import { marked, Renderer } from "marked";

// --- Types ---

export interface ArticleMeta {
  slug: string;
  routePrefix: "resources" | "races";
  targetKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  wordCount: number;
  publishedDate: string;
  modifiedDate: string;
}

export interface ArticleContent {
  meta: ArticleMeta;
  title: string;
  htmlContent: string;
  readingTime: number;
  headings: { id: string; text: string }[];
  faqs: { question: string; answer: string }[];
}

// --- Registry ---

interface RegistryEntry {
  file: string;
  routePrefix: "resources" | "races";
  isPillar?: boolean;
}

const ARTICLES: Record<string, RegistryEntry> = {
  "70-3-race-execution-guide": {
    file: "01-pillar-70.3-race-execution-guide.md",
    routePrefix: "resources",
    isPillar: true,
  },
  "70-3-bike-pacing-strategy": {
    file: "02-cluster-70.3-bike-pacing-strategy.md",
    routePrefix: "resources",
  },
  "70-3-nutrition-timeline": {
    file: "03-cluster-70.3-nutrition-timeline.md",
    routePrefix: "resources",
  },
  "70-3-common-mistakes": {
    file: "04-cluster-70.3-common-mistakes.md",
    routePrefix: "resources",
  },
  "ironman-70-3-dubai": {
    file: "05-race-specific-ironman-703-dubai.md",
    routePrefix: "races",
  },
  "ironman-70-3-boulder": {
    file: "06-race-specific-ironman-703-boulder.md",
    routePrefix: "races",
  },
};

const CONTENT_DIR = path.join(process.cwd(), "content", "seo");

// --- Markdown renderer ---

function createRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.heading = function ({ text, depth }) {
    const id = text
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  renderer.link = function ({ href, title, text }) {
    const titleAttr = title ? ` title="${title}"` : "";
    if (href.startsWith("http")) {
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    return `<a href="${href}"${titleAttr}>${text}</a>`;
  };

  return renderer;
}

const renderer = createRenderer();

// --- Parsers ---

function parseMetadataBlock(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const lines = raw.split("\n");
  const metaLines: string[] = [];
  let bodyStartIndex = 0;
  let inMeta = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(">")) {
      inMeta = true;
      metaLines.push(line.replace(/^>\s*/, ""));
    } else if (inMeta) {
      bodyStartIndex = i;
      break;
    }
  }

  // Skip leading --- separator after metadata
  let bodyStart = bodyStartIndex;
  for (let i = bodyStartIndex; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      bodyStart = i + 1;
      break;
    }
    if (lines[i].trim() !== "") {
      bodyStart = i;
      break;
    }
  }

  const meta: Record<string, string> = {};
  for (const line of metaLines) {
    const match = line.match(/\*\*(.+?):\*\*\s*(.+)/);
    if (match) {
      meta[match[1].trim()] = match[2].trim();
    }
  }

  return { meta, body: lines.slice(bodyStart).join("\n") };
}

function extractTitle(raw: string): string {
  const match = raw.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}

function extractHeadings(html: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const regex = /<h2\s+id="([^"]*)">(.*?)<\/h2>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "");
    headings.push({ id: match[1], text });
  }
  return headings;
}

function extractFAQs(
  markdown: string
): { question: string; answer: string }[] {
  const faqSectionMatch = markdown.match(
    /## (?:FAQ|Frequently Asked Questions)\s*\n([\s\S]*?)(?=\n---|\n## |\*Last updated|$)/
  );
  if (!faqSectionMatch) return [];

  const faqText = faqSectionMatch[1];
  const faqs: { question: string; answer: string }[] = [];
  const qaPairs = faqText.split(/\n\*\*/).filter((s) => s.trim());

  for (const pair of qaPairs) {
    const match = pair.match(/(.+?)\*\*\s*\n([\s\S]*?)$/);
    if (match) {
      const question = match[1].trim().replace(/\?$/, "") + "?";
      const answer = match[2].trim();
      if (question.length > 5 && answer.length > 10) {
        faqs.push({ question, answer });
      }
    }
  }

  return faqs;
}

function computeReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 250));
}

// --- Public API ---

export function getArticle(slug: string): ArticleContent | null {
  const entry = ARTICLES[slug];
  if (!entry) return null;

  const filePath = path.join(CONTENT_DIR, entry.file);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const title = extractTitle(raw);
  const { meta, body } = parseMetadataBlock(raw);

  // Strip the h1 title from the body to avoid duplication
  const bodyWithoutTitle = body.replace(/^#\s+.+\n*/m, "");

  const htmlContent = marked(bodyWithoutTitle, { renderer, gfm: true }) as string;
  const headings = extractHeadings(htmlContent);
  const faqs = extractFAQs(body);
  const readingTime = computeReadingTime(body);

  const secondaryKeywords = (meta["Secondary keywords"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    meta: {
      slug,
      routePrefix: entry.routePrefix,
      targetKeyword: meta["Target keyword"] || "",
      secondaryKeywords,
      metaTitle: meta["Meta title"] || title,
      metaDescription: meta["Meta description"] || "",
      wordCount: parseInt(meta["Word count"]?.replace(/[~,]/g, "") || "0", 10),
      publishedDate: "2026-03-13",
      modifiedDate: "2026-03-13",
    },
    title,
    htmlContent,
    readingTime,
    headings,
    faqs,
  };
}

export function getAllSlugs(
  prefix: "resources" | "races"
): string[] {
  return Object.entries(ARTICLES)
    .filter(([, entry]) => entry.routePrefix === prefix)
    .map(([slug]) => slug);
}

export function getArticleSummaries(
  prefix?: "resources" | "races"
): (ArticleMeta & { title: string; readingTime: number; isPillar: boolean })[] {
  return Object.entries(ARTICLES)
    .filter(([, entry]) => !prefix || entry.routePrefix === prefix)
    .map(([slug, entry]) => {
      const article = getArticle(slug);
      if (!article) return null;
      return {
        ...article.meta,
        title: article.title,
        readingTime: article.readingTime,
        isPillar: entry.isPillar ?? false,
      };
    })
    .filter(Boolean) as (ArticleMeta & {
    title: string;
    readingTime: number;
    isPillar: boolean;
  })[];
}
