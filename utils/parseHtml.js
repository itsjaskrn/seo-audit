import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { extractSections } from "./extractSections.js";

export async function parseHtml(html, url, keyword, headers) {
  const $ = cheerio.load(html);

  // Remove footer
  $("footer, div[id*=footer], div[class*=footer], section[class*=footer]").remove();

  // Plain text
  const plainText = $("body").text().replace(/\s+/g, " ").trim();
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Metadata
  const title = $("title").text() || null;
  const description = $("meta[name=description]").attr("content") || null;
  const canonical = $("link[rel=canonical]").attr("href") || null;
  const robots = $("meta[name=robots]").attr("content")?.toLowerCase() || null;

  // Open Graph
  const openGraph = {
    ogTitle: $("meta[property='og:title']").attr("content") || null,
    ogDescription: $("meta[property='og:description']").attr("content") || null,
    ogImage: $("meta[property='og:image']").attr("content") || null
  };

  // Hreflang
  const hreflangTags = [];
  $("link[rel=alternate][hreflang]").each((_, el) => {
    hreflangTags.push({
      hreflang: $(el).attr("hreflang"),
      href: $(el).attr("href")
    });
  });

  // Structured Data
  const jsonLdMatches = [];
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (Array.isArray(json)) {
        json.forEach(j => jsonLdMatches.push(j["@type"]));
      } else if (json["@type"]) {
        jsonLdMatches.push(json["@type"]);
      }
    } catch {}
  });
  const hasMicrodata = $("[itemscope],[itemtype],[itemprop]").length > 0;

  // Robots.txt + Sitemap
  const domain = new URL(url).origin;
  let robotsTxt = "robots.txt not found";
  let sitemaps = [];

  try {
    const robotsRes = await fetch(domain + "/robots.txt", { headers });
    if (robotsRes.ok) {
      robotsTxt = await robotsRes.text();
      const matches = robotsTxt.match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi) || [];
      sitemaps = matches.map(s => s.replace("Sitemap: ", "").trim());
    }
  } catch {}

  if (sitemaps.length === 0) {
    const fallbacks = ["/sitemap.xml", "/sitemap_index.xml"];
    for (const path of fallbacks) {
      try {
        const res = await fetch(domain + path, { headers });
        if (res.ok && res.headers.get("content-type")?.includes("xml")) {
          sitemaps.push(domain + path);
          break;
        }
      } catch {}
    }
  }

  // Images
  const imageAltDetails = [];
  $("img").each((i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "[No src]";
    const alt = $(el).attr("alt") || "";
    imageAltDetails.push({
      index: i + 1,
      src,
      alt: alt || "[Missing alt]",
      missing: !alt
    });
  });
  const imageTruncated = imageAltDetails.length > 50;
  const truncatedImages = imageAltDetails.slice(0, 50);

  // Links
  const linkTags = $("a[href]").map((_, el) => $(el).attr("href")).get();
  const internalLinks = linkTags.filter(href => href.startsWith("/") || href.includes(new URL(url).hostname));
  const linkStats = {
    totalLinks: linkTags.length,
    internalLinks: internalLinks.length,
    externalLinks: linkTags.length - internalLinks.length
  };

  // Anchor texts inside <p>
  const anchorTexts = [];
  $("p a[href]").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim() || "[No visible text]";
    const rel = $(el).attr("rel") || "";
    const linkType = rel.includes("nofollow") ? "nofollow" : "dofollow";
    const isInternal = href.startsWith("/") || href.includes(new URL(url).hostname);
    if (!href.startsWith("javascript:") && !$(el).hasClass("button")) {
      anchorTexts.push({ index: i + 1, href, text, type: linkType, isInternal });
    }
  });
  const anchorTruncated = anchorTexts.length > 50;
  const truncatedAnchorTexts = anchorTexts.slice(0, 50);

  // Headings
  const headingStats = {
    h1: $("h1").length,
    h2: $("h2").length,
    h3: $("h3").length,
    h4: $("h4").length,
    h5: $("h5").length,
    h6: $("h6").length
  };

  // Sections
  const contentSections = extractSections(html);

  // Keyword
  const normalizedText = plainText.toLowerCase().replace(/[^a-z0-9\s]/gi, " ");
  const normalizedKeyword = keyword?.toLowerCase().trim() || "";
  const regex = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, "\\s+")}\\b`, "gi");
  const matches = normalizedKeyword ? normalizedText.match(regex) || [] : [];
  const keywordFrequency = matches.length;
  const usageRatio = wordCount > 0 ? keywordFrequency / wordCount : 0;
  const keywordStuffing = keywordFrequency > 30 || usageRatio > 0.05;

  // Buzzwords
  const aiBuzzPhrases = [
    "in today's fast-paced world", "ai is revolutionizing the world",
    "unlock the power of", "let’s dive in", "cutting-edge technology",
    "next-gen innovation", "seamless integration", "holistic approach"
  ];
  const detectedBuzz = aiBuzzPhrases.filter(p => plainText.toLowerCase().includes(p));

  // Suggestions
  const suggestions = [];
  if (keywordStuffing) suggestions.push(`Keyword "${keyword}" may be overused (${keywordFrequency} times).`);
  if (detectedBuzz.length) suggestions.push(`Buzzword-like phrases found: ${detectedBuzz.join(", ")}`);
  if (imageAltDetails.filter(img => img.missing).length > 0) suggestions.push(`Add alt attributes to ${imageAltDetails.filter(img => img.missing).length} images.`);
  if (headingStats.h1 === 0) suggestions.push("No <h1> tag found.");
  if (linkStats.internalLinks === 0) suggestions.push("No internal links found.");

  return {
    hreflangTags,
    sitemaps,
    robotsTxt,
    metadata: { title, description, canonical, robots },
    openGraph,
    structuredData: {
      jsonLdCount: jsonLdMatches.length,
      types: Array.from(new Set(jsonLdMatches)),
      hasMicrodata
    },
    wordCount,
    contentSections,
    keyword,
    keywordFrequency,
    keywordStuffing,
    detectedBuzzwords: detectedBuzz,
    plainText,
    imageAltStats: {
      totalImages: imageAltDetails.length,
      imagesWithAlt: imageAltDetails.filter(img => !img.missing).length,
      imagesMissingAlt: imageAltDetails.filter(img => img.missing).length,
      truncated: imageTruncated,
      detailedList: truncatedImages
    },
    anchorTexts: truncatedAnchorTexts,
    anchorSummary: { totalFound: anchorTexts.length, truncated: anchorTruncated },
    linkStats,
    headingStats,
    suggestions
  };
}
