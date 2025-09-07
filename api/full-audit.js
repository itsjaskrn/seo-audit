export default async function handler(req, res) {
  const url = req.query.url;
  const keyword = req.query.keyword || "";
  const userAgent = req.query['user-agent'] || 'chrome';

  if (!url) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  try {
    // Call Cloudflare Worker with all parameters
    const workerUrl = `https://seo-audit.itsjaskrn.workers.dev/?url=${encodeURIComponent(url)}`;
    const finalUrl = keyword ? `${workerUrl}&keyword=${encodeURIComponent(keyword)}` : workerUrl;
    const userAgentUrl = `${finalUrl}&user-agent=${userAgent}`;
    
    const workerResponse = await fetch(userAgentUrl);
    const workerData = await workerResponse.json();

    if (workerData.error) {
      return res.status(502).json({
        error: "Worker fetch failed",
        details: workerData.error
      });
    }

    // If no keyword provided, return suggested keywords
    if (!keyword && workerData.suggestedKeywords) {
      return res.status(200).json({
        message: "No focus keyword provided. Would you like to use one of these?",
        suggestedKeywords: workerData.suggestedKeywords
      });
    }

    // Return comprehensive SEO audit data from Cloudflare Worker
    return res.status(200).json({
      targetUrl: workerData.targetUrl,
      redirectChain: workerData.redirectChain || [],
      hreflangTags: workerData.hreflangTags || [],
      sitemaps: workerData.sitemaps || [],
      robotsTxt: workerData.robotsTxt || 'Not found',
      metadata: workerData.metadata || {},
      openGraph: workerData.openGraph || {},
      structuredData: workerData.structuredData || { jsonLdCount: 0, types: [], hasMicrodata: false },
      wordCount: workerData.wordCount || 0,
      intent: workerData.intent || 'Unknown',
      contentSections: workerData.contentSections || [],
      focusKeyword: workerData.focusKeyword || keyword,
      keywordFrequency: workerData.keywordFrequency || 0,
      keywordStuffing: workerData.keywordStuffing || false,
      detectedBuzzwords: workerData.detectedBuzzwords || [],
      plainText: workerData.plainText || '',
      imageAltStats: workerData.imageAltStats || {
        totalImages: 0,
        imagesWithAlt: 0,
        imagesMissingAlt: 0,
        truncated: false,
        detailedList: []
      },
      anchorTexts: workerData.anchorTexts || [],
      anchorSummary: workerData.anchorSummary || { totalFound: 0, truncated: false },
      linkStats: workerData.linkStats || { totalLinks: 0, internalLinks: 0, externalLinks: 0 },
      headingStats: workerData.headingStats || { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
      suggestions: workerData.suggestions || [],
      message: workerData.message || "SEO audit completed successfully"
    });

  } catch (err) {
    console.error("Full audit failed:", err);
    return res.status(500).json({
      error: "SEO audit failed",
      details: err.message
    });
  }
}
