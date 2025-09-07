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

    // 1. Fetch page + handle redirects
    const pageData = await fetchPage(url);

    // 2. Parse HTML for SEO issues
    const seoCheck = await parseHtml(pageData.html);

    // 3. Detect search intent from keyword
    const intent = keyword ? await detectIntent(keyword, pageData.text) : null;

    // 4. Extract content sections
    const sections = await extractSections(pageData.html);

    res.status(200).json({
      url,
      seoCheck,
      parseHtml: {
        headings: seoCheck.headings || [],
        links: seoCheck.links || []
      },
      detectIntent: intent ? { keyword, intent } : null,
      extractSections: sections
    });

  } catch (error) {
    console.error("Full audit failed:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
