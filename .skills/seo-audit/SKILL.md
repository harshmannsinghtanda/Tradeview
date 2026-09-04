---
name: seo-audit
description: |
  Comprehensive technical SEO auditing framework, semantic HTML5 structure, structured data schemas (JSON-LD), Open Graph metadata, Core Web Vitals optimization, indexing rules, and search engine visibility checklist.

  Trigger whenever:
  - Auditing, building, or refining web application metadata, HTML structure, or indexing.
  - Adding Open Graph / Twitter Card tags, JSON-LD structured schemas, or canonical links.
  - Diagnosing performance & Core Web Vitals (LCP, INP, CLS) impact on search rankings.
  - Creating `robots.txt`, `sitemap.xml`, or multi-language `hreflang` configurations.
---

# Technical SEO Audit & Optimization Skill

A rigorous technical framework for auditing and optimizing web pages for search engines, social media previews, accessibility, and Core Web Vitals.

---

## 1. On-Page Meta & Document Head Checklist

Every HTML page must contain a complete, well-formed `<head>` section:

```html
<!-- Primary Meta Tags -->
<title>Descriptive Title Under 60 Characters | Brand Name</title>
<meta name="title" content="Descriptive Title Under 60 Characters | Brand Name" />
<meta name="description" content="Compelling meta description between 150-160 characters containing targeted keywords and a clear call to action." />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="canonical" href="https://example.com/current-page" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://example.com/current-page" />
<meta property="og:title" content="Social Preview Title" />
<meta property="og:description" content="Social preview description for Facebook, LinkedIn, Discord." />
<meta property="og:image" content="https://example.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Social Preview Title" />
<meta name="twitter:description" content="Social preview description for Twitter/X." />
<meta name="twitter:image" content="https://example.com/og-image.jpg" />
```

---

## 2. Semantic HTML & Content Hierarchy Rules

- **Heading Structure**: Exactly one `<h1>` per page matching the page primary topic. Logical sequence `<h1>` → `<h2>` → `<h3>`. Never skip heading levels for visual styling (use CSS classes instead).
- **Semantic Containers**: Use `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`.
- **Image Accessibility & SEO**:
  - Every `<img>` tag **must** have a descriptive `alt` attribute.
  - Use `loading="lazy"` for below-the-fold images, and `priority` / `fetchpriority="high"` for hero/LCP images.
  - Define explicit `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).

---

## 3. Structured Data (JSON-LD Schemas)

Implement Schema.org JSON-LD scripts to earn rich snippets (Star ratings, FAQ dropdowns, breadcrumbs, price badges):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Trading Journal Pro",
  "operatingSystem": "Web",
  "applicationCategory": "FinanceApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "1280"
  }
}
</script>
```

---

## 4. Technical SEO & Indexing Architecture

1. **`robots.txt`**:
   - Ensure clean crawling permissions. Allow Googlebot and Bingbot access to assets (CSS, JS, images).
   - Point to `sitemap.xml`.
2. **`sitemap.xml`**:
   - Dynamic auto-generated sitemap listing all canonical indexable URLs with `<lastmod>` timestamps.
3. **HTTP Redirects & Canonicals**:
   - Force HTTP to HTTPS and `www` to non-`www` (or vice versa) via 301 permanent redirects.
   - Enforce trailing slash consistency.

---

## 5. Core Web Vitals Audit Criteria

| Metric | Target | Optimization Strategy |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | `< 2.5s` | Preload critical hero images/fonts, use modern webp/avif, optimize server response time (TTFB). |
| **INP** (Interaction to Next Paint) | `< 200ms` | Break up long JavaScript tasks, defer heavy calculations via `requestIdleCallback` or `useTransition`. |
| **CLS** (Cumulative Layout Shift) | `< 0.1` | Reserve image/ad dimensions, avoid inserting dynamic elements above existing content without height reservation. |
