# SEO Quick Start Checklist

## Immediate Actions (After Deployment)

### Week 1: Foundation Setup

#### 1. Google Search Console (30 minutes)

- [ ] Go to [search.google.com/search-console](https://search.google.com/search-console)
- [ ] Add property: `https://racedayai.com`
- [ ] Verify ownership (choose one method):
  - DNS record (recommended for Vercel)
  - HTML file upload
  - Meta tag in `<head>`
- [ ] Submit sitemap: `https://racedayai.com/sitemap.xml`
- [ ] Enable email notifications for critical issues

#### 2. Verify Technical Implementation (15 minutes)

- [ ] Visit `https://racedayai.com/robots.txt` - should show AI crawler rules
- [ ] Visit `https://racedayai.com/sitemap.xml` - should list all pages
- [ ] Check homepage source code - verify Open Graph tags present
- [ ] Test share preview: [opengraph.xyz](https://www.opengraph.xyz/)

#### 3. Schema Validation (10 minutes)

- [ ] Test homepage at [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Verify Organization schema appears
- [ ] Check for errors or warnings
- [ ] Fix any validation issues

#### 4. Create Social Share Images (30 minutes)

- [ ] Design 1200x630px image for `/public/og-image.png`
- [ ] Include: RaceDayAI logo, tagline, visual appeal
- [ ] Optimize file size (<200KB)
- [ ] Test sharing on Twitter/LinkedIn

### Week 2: Content Creation Begins

#### 5. First Pillar Page (4-6 hours)

Create: `/src/app/resources/703-race-execution-guide/page.tsx`

**Structure:**
```typescript
import { Metadata } from 'next';
import { generateArticleSchema, jsonLdScript } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Complete 70.3 Race Execution Guide',
  description: 'Comprehensive guide to executing a perfect IRONMAN 70.3...',
  // Add Open Graph, etc.
};

export default function Guide703Page() {
  const schema = generateArticleSchema({
    title: 'Complete 70.3 Race Execution Guide',
    description: '...',
    publishedDate: new Date().toISOString(),
    authorName: 'RaceDayAI Team',
    imageUrl: 'https://racedayai.com/images/703-guide.jpg',
    url: 'https://racedayai.com/resources/703-race-execution-guide',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(schema)}
      />
      {/* Your content */}
    </>
  );
}
```

**Content Outline:**
1. Introduction (200 words)
2. Bike Pacing Strategy (800 words)
3. Run Execution (600 words)
4. Nutrition Planning (500 words)
5. Weather Adjustments (400 words)
6. Common Mistakes (500 words)
7. FAQ Section (10 Q&As)
8. Related Resources (links to cluster pages)

**SEO Requirements:**
- [ ] 3,000+ words total
- [ ] Target keyword: "70.3 race execution"
- [ ] Include data/statistics
- [ ] Add FAQ schema
- [ ] 8-10 internal links
- [ ] Clear H2/H3 structure

#### 6. First 3 Cluster Pages (2-3 hours each)

Create supporting articles:

1. `/src/app/resources/703-bike-pacing-strategy/page.tsx`
   - Target: "70.3 bike pacing"
   - 1,200 words
   - Link back to pillar

2. `/src/app/resources/703-nutrition-timeline/page.tsx`
   - Target: "70.3 nutrition plan"
   - 1,000 words
   - Link back to pillar

3. `/src/app/resources/703-common-mistakes/page.tsx`
   - Target: "70.3 mistakes"
   - 1,000 words
   - Link back to pillar

### Week 3-4: Community & Outreach

#### 7. Reddit Engagement (30 min/day)

- [ ] Subscribe to r/triathlon
- [ ] Set reminder to check daily
- [ ] Answer 1-2 questions per day
- [ ] Post genuine race report with data (when you have one)
- [ ] Share algorithm explanation (technical deep dive)
- [ ] NO SPAM - add value first

**Example Comment Template:**
```
Great question! Based on our analysis of 500+ races,
[answer with data]. If you want to calculate your specific
targets, [brief explanation]. Happy to elaborate if helpful!
```

#### 8. Directory Submissions (2 hours)

- [ ] [Product Hunt](https://www.producthunt.com/posts/create) - Launch post
- [ ] [Capterra](https://www.capterra.com/vendors/add) - Software listing
- [ ] [G2](https://www.g2.com/products/new) - Software reviews
- [ ] [AlternativeTo](https://alternativeto.net/software/suggest/) - Alternative to X

#### 9. Podcast Outreach (1 hour)

Draft pitch email and send to:

- [ ] Triathlon Taren (contact form)
- [ ] That Triathlon Show (email)
- [ ] IMTalk (email)
- [ ] Purple Patch Podcast (email)

**Email Template:**
```
Subject: The Data Science of Race Day Execution

Hi [Host],

I'm [Name], creator of RaceDayAI. We analyzed 500+ IRONMAN
finishes and found [interesting stat]. Would love to share
our findings on [podcast name].

Key insights:
- 73% of athletes pace incorrectly
- Optimal intensity factors by distance
- Weather impact algorithms

[Your background]

Would this fit your show?

Best,
[Name]
```

### Month 2: Scale Content

#### 10. Complete Pillar #1 Cluster (10-12 hours)

Finish remaining 5 cluster pages:
- [ ] 703-run-strategy
- [ ] 703-heat-management
- [ ] 703-transition-checklist
- [ ] 703-weather-adjustments
- [ ] 703-finish-time-prediction

#### 11. Start Race-Specific Pages (2 hours each)

Top 5 priority races:
- [ ] IRONMAN 70.3 Dubai
- [ ] IRONMAN Kona
- [ ] IRONMAN 70.3 Worlds
- [ ] IRONMAN 70.3 Boulder
- [ ] Challenge Roth

**Page Template:**
```typescript
// Include location-based schema
const eventSchema = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "IRONMAN 70.3 Dubai",
  "location": {
    "@type": "Place",
    "name": "Dubai, UAE",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Dubai",
      "addressCountry": "AE"
    }
  },
  "startDate": "2026-03-07"
};
```

## Monitoring Dashboard

### Weekly Checks (15 minutes)

1. **Google Search Console**
   - Check coverage: any errors?
   - Review performance: clicks trending up?
   - Check queries: new keywords appearing?

2. **Vercel Analytics**
   - Total visitors this week
   - Top pages by traffic
   - Referral sources

3. **Speed Insights**
   - Core Web Vitals scores
   - Any performance regressions?

### Monthly Review (1 hour)

1. **Traffic Analysis**
   - Compare to previous month
   - Identify top-performing content
   - Find underperforming pages

2. **Keyword Rankings**
   - Track position changes
   - Identify new opportunities
   - Update content strategy

3. **Backlink Check**
   - New referring domains?
   - Quality of backlinks
   - Any toxic links to disavow?

## Content Calendar Template

### Month 1
- Week 1: Pillar page + 2 cluster pages
- Week 2: 3 cluster pages
- Week 3: 3 cluster pages
- Week 4: 2 race-specific pages

### Month 2
- Week 1: Start Pillar #2 + 2 cluster pages
- Week 2: 3 cluster pages
- Week 3: 3 cluster pages
- Week 4: Original research report

### Month 3
- Week 1: Pillar #3 + 2 cluster pages
- Week 2: 5 race-specific pages
- Week 3: FAQ pages + calculators
- Week 4: Guest posts + outreach

## AI Citation Strategy

### Make Content AI-Friendly

**Structure for Citations:**

```markdown
# Clear Question as H1

## Direct Answer (100 words)
[Concise answer with specific data]

## Detailed Explanation

### Key Statistics
- 73% of athletes [specific finding]
- Optimal range: 0.72-0.82 IF
- Research shows [citation]

### How to Calculate
[Step-by-step with formula]

### Example
[Real-world example with numbers]

## Common Mistakes
- [Mistake 1] leads to [outcome]
- [Mistake 2] results in [consequence]

## FAQ

**Q: [Common question]?**
A: [Direct answer]
```

**Why This Works:**
- AI can extract direct answers
- Clear structure = easy parsing
- Specific data = citability
- Examples = practical value

## Quick Wins (Do Today!)

### Immediate Impact (< 1 hour)

1. **Add "Last Updated" to All Pages**
   ```typescript
   <p className="text-sm text-muted-foreground">
     Last updated: {new Date().toLocaleDateString()}
   </p>
   ```

2. **Create Simple Calculator Widget**
   - FTP zone calculator
   - Pace converter
   - Embeddable for backlinks

3. **Write "About" Page**
   - Who you are
   - Why you built this
   - Your qualifications
   - E-E-A-T signals

4. **Add Share Buttons to Plan Pages**
   - Twitter/X
   - Facebook
   - LinkedIn
   - Copy link

### This Weekend (2-4 hours)

1. **Write First Blog Post**
   - "We Analyzed 500 IRONMAN Races - Here's What We Found"
   - Include data visualizations
   - Make it shareable

2. **Create Resource Hub Page**
   - `/resources` - Landing page
   - Links to all guides
   - Navigation for users & crawlers

3. **Set Up Email Newsletter**
   - Collect emails on homepage
   - "Weekly Race Execution Tips"
   - Drive repeat traffic

## Tools Setup

### Install Chrome Extensions

- [ ] [SEO Minion](https://chrome.google.com/webstore/detail/seo-minion/) - Quick SEO checks
- [ ] [Detailed](https://chrome.google.com/webstore/detail/detailed-seo-extension/) - Page analysis
- [ ] [Lighthouse](https://chrome.google.com/webstore/detail/lighthouse/) - Performance

### Bookmark These URLs

- [ ] [Google Search Console](https://search.google.com/search-console)
- [ ] [Vercel Analytics](https://vercel.com/analytics)
- [ ] [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/)
- [ ] [GTmetrix](https://gtmetrix.com/)

## Success Metrics (Set Goals)

### Month 1 Targets
- [ ] 50+ pages indexed
- [ ] 100+ monthly organic visitors
- [ ] 5+ referring domains
- [ ] Google Search Console setup complete

### Month 3 Targets
- [ ] 200+ pages indexed
- [ ] 1,000+ monthly organic visitors
- [ ] 20+ referring domains
- [ ] First page ranking for 1 keyword

### Month 6 Targets
- [ ] 500+ pages indexed
- [ ] 5,000+ monthly organic visitors
- [ ] 50+ referring domains
- [ ] Top 10 for 5 target keywords
- [ ] First AI citation

## Common Questions

**Q: How long until I see results?**
A: 2-3 months for initial traffic, 6-12 months for significant growth.

**Q: What's most important to focus on first?**
A: Technical SEO (done ✅), then content quality, then backlinks.

**Q: How often should I publish?**
A: 2-4 high-quality articles per week is ideal. Consistency > volume.

**Q: Do I need to pay for tools?**
A: No. Google Search Console + Analytics are free and sufficient initially.

**Q: When will AI start citing my content?**
A: 4-8 weeks after crawling, but requires high-quality, data-driven content.

---

## Your First Week Action Plan

**Monday:**
- [ ] Deploy SEO changes
- [ ] Set up Google Search Console
- [ ] Submit sitemap

**Tuesday:**
- [ ] Verify robots.txt and sitemap working
- [ ] Test schema markup
- [ ] Create social share image

**Wednesday:**
- [ ] Start writing pillar page
- [ ] Research keywords
- [ ] Outline structure

**Thursday:**
- [ ] Continue pillar page
- [ ] Add data/statistics
- [ ] Create internal links

**Friday:**
- [ ] Finish pillar page
- [ ] Publish and share
- [ ] Start first cluster page

**Weekend:**
- [ ] Write first Reddit post (race report)
- [ ] Engage with community
- [ ] Plan next week's content

---

**Remember:** SEO is a marathon, not a sprint. Focus on creating genuine value, and rankings will follow.

Good luck! 🚀
