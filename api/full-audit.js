import { fetchWithRedirects } from "../utils/fetchPage.js";
import parseHtml from "../utils/parseHtml.js";
import detectIntent from "../utils/detectIntent.js";
import extractSections from "../utils/extractSections.js";

export default async function handler(req, res) {
  const url = req.query.url;
  const keyword = req.query.keyword || "";

  if (!url) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  try {
    // 1. Fetch page safely
    // Add protocol if missing
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = 'https://' + url;
    }

    const { html, redirectChain } = await fetchWithRedirects(targetUrl, {
      "User-Agent": "Mozilla/5.0", 
      "Accept": "text/html"
    });
    
    const pageData = { html, text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), finalUrl: targetUrl };

    if (!pageData.html) {
      return res.status(502).json({
        error: "Unable to fetch target site",
        reason: pageData.error || "Blocked or unreachable",
        url
      });
    }

    // 2. Parse HTML (wrapped in try/catch)
    let seoCheck = {};
    try {
      seoCheck = await parseHtml(pageData.html);
    } catch (err) {
      seoCheck = { error: "HTML parsing failed", details: err.message };
    }

    // 3. Detect intent (safe)
    let intent = null;
    try {
      if (keyword) {
        intent = await detectIntent(keyword, pageData.text);
      }
    } catch (err) {
      intent = { error: "Intent detection failed", details: err.message };
    }

    // 4. Extract sections (safe)
    let sections = [];
    try {
      sections = await extractSections(pageData.html);
    } catch (err) {
      sections = [{ heading: "Error", content: "Section extraction failed" }];
    }

    // ✅ Always return structured JSON
    return res.status(200).json({
      url: pageData.finalUrl || url,
      status: pageData.status || 200,
      seoCheck,
      parseHtml: {
        headings: seoCheck.headings || [],
        links: seoCheck.links || []
      },
      detectIntent: intent,
      extractSections: sections
    });

  } catch (error) {
    console.error("Full audit fatal error:", error);
    return res.status(500).json({
      error: "Full SEO audit crashed",
      details: error.message,
      url
    });
  }
}
