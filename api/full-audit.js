import fetchPage from "../utils/fetchPage";
import parseHtml from "../utils/parseHtml";
import detectIntent from "../utils/detectIntent";
import extractSections from "../utils/extractSections";

export default async function handler(req, res) {
  try {
    const url = req.query.url;
    const keyword = req.query.keyword || "";

    if (!url) {
      return res.status(400).json({ error: "Missing required query parameter: url" });
    }

    // Fetch page safely
    const pageData = await fetchPage(url);

    // If fetch failed, stop early and return message
    if (pageData.error || !pageData.html) {
      return res.status(502).json({
        error: "Failed to fetch page",
        details: pageData.error || "Unknown error while fetching page"
      });
    }

    // Run SEO analysis
    const seoCheck = await parseHtml(pageData.html);

    // Detect intent (only if keyword is passed)
    const intent = keyword ? await detectIntent(keyword, pageData.text) : null;

    // Extract sections
    const sections = await extractSections(pageData.html);

    res.status(200).json({
      url: pageData.finalUrl,
      seoCheck,
      parseHtml: {
        headings: seoCheck.headings || [],
        links: seoCheck.links || []
      },
      detectIntent: intent ? { keyword, intent } : null,
      extractSections: sections
    });

  } catch (error) {
    console.error("Full audit failed for:", req.query.url, error);
    res.status(500).json({
      error: "SEO audit failed",
      details: error.message
    });
  }
}
