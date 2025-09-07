import * as cheerio from "cheerio";

export default async function parseHtml(html, keyword = "", url = "") {
  const $ = cheerio.load(html);
  const domain = url ? new URL(url).hostname : "";

  // Title
  const title = $("title").text().trim() || "";

  // Meta Description
  const metaDescription = $("meta[name='description']").attr("content")?.trim() || "";

  // Canonical
  const canonical = $("link[rel='canonical']").attr("href")?.trim() || "";

  // Robots
  const robots = $("meta[name='robots']").attr("content")?.trim() || "";

  // Open Graph
  const ogTitle = $("meta[property='og:title']").attr("content")?.trim() || "";
  const ogDescription = $("meta[property='og:description']").attr("content")?.trim() || "";
  const ogImage = $("meta[property='og:image']").attr("content")?.trim() || "";

  // Hreflang
  const hreflangLinks = [];
  $("link[rel='alternate'][hreflang]").each((i, el) => {
    hreflangLinks.push({
      hreflang: $(el).attr("hreflang"),
      href: $(el).attr("href")
    });
  });

  // JSON-LD structured data
  const jsonLdScripts = [];
  $("script[type='application/ld+json']").each((i, el) => {
    try {
      jsonLdScripts.push(JSON.parse($(el).html()));
    } catch (err) {
      // ignore invalid JSON
    }
  });

  // Content Analysis
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  // Headings
  const headings = {
    h1: $("h1").map((i, el) => $(el).text().trim()).get(),
    h2: $("h2").length,
    h3: $("h3").length,
    h4: $("h4").length,
    h5: $("h5").length,
    h6: $("h6").length
  };

  // Links Analysis
  const links = [];
  $("a[href]").each((i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    const rel = $(el).attr("rel") || "";
    const isInternal = href.startsWith("/") || href.includes(domain);
    const type = rel.includes("nofollow") ? "nofollow" : "dofollow";
    
    if (href && !href.startsWith("javascript:") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
      links.push({ text, href, type, isInternal });
    }
  });

  // Images Analysis
  const images = [];
  $("img").each((i, el) => {
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    images.push({ src, alt: alt.trim() });
  });

  // Keyword Analysis
  let keywordData = { count: 0, density: 0, inTitle: false, inDescription: false, inH1: false };
  if (keyword) {
    const keywordRegex = new RegExp(keyword, "gi");
    const matches = bodyText.match(keywordRegex) || [];
    keywordData = {
      count: matches.length,
      density: wordCount > 0 ? ((matches.length / wordCount) * 100).toFixed(2) : 0,
      inTitle: title.toLowerCase().includes(keyword.toLowerCase()),
      inDescription: metaDescription.toLowerCase().includes(keyword.toLowerCase()),
      inH1: headings.h1.some(h => h.toLowerCase().includes(keyword.toLowerCase()))
    };
  }

  // Helpers
  const countChars = str => str ? str.length : 0;
  const containsKeyword = (str, kw) => kw && str.toLowerCase().includes(kw.toLowerCase());

  // ✅ Comprehensive SEO Analysis
  return {
    metadata: {
      raw: { title, description: metaDescription, canonical, robots },
      summary: {
        title: title ? `${countChars(title)} chars` : "Missing",
        description: metaDescription
          ? `${countChars(metaDescription)} chars${keyword && containsKeyword(metaDescription, keyword) ? ", includes keyword" : ""}`
          : "Missing",
        canonical: canonical ? "Present" : "Missing",
        robots: robots || "index, follow"
      }
    },
    openGraph: {
      raw: { ogTitle, ogDescription, ogImage },
      summary: {
        ogTitle: ogTitle ? "Present" : "Missing",
        ogDescription: ogDescription ? "Present" : "Missing",
        ogImage: ogImage ? "Present" : "Missing"
      }
    },
    hreflang: {
      raw: hreflangLinks,
      summary: {
        count: hreflangLinks.length,
        languages: hreflangLinks.map(h => h.hreflang).filter(Boolean)
      }
    },
    structuredData: {
      raw: jsonLdScripts,
      summary: {
        jsonLdCount: jsonLdScripts.length,
        types: jsonLdScripts.map(j => {
          const type = j["@type"];
          return Array.isArray(type) ? type : [type];
        }).flat().filter(Boolean),
        hasMicrodata: $("[itemscope]").length > 0
      }
    },
    content: {
      raw: { wordCount, headings, keywordData },
      summary: {
        wordCount,
        h1Count: headings.h1.length,
        h1Text: headings.h1,
        hasMultipleH1: headings.h1.length > 1,
        keywordDensity: keywordData.density,
        keywordInTitle: keywordData.inTitle,
        keywordInDescription: keywordData.inDescription,
        keywordInH1: keywordData.inH1
      }
    },
    links: {
      raw: links,
      summary: {
        total: links.length,
        internal: links.filter(l => l.isInternal).length,
        external: links.filter(l => !l.isInternal).length,
        nofollow: links.filter(l => l.type === "nofollow").length
      }
    },
    images: {
      raw: images,
      summary: {
        total: images.length,
        withAlt: images.filter(img => img.alt).length,
        missingAlt: images.filter(img => !img.alt).length
      }
    }
  };
}
