export default async function handler(req, res) {
  const url = req.query.url || "https://example.com";
  const keyword = req.query.keyword || "seo audit";

  // Mock SEO check
  const seoCheck = {
    status: "ok",
    input: url,
    seoScore: 85,
    issues: ["Missing meta description", "Duplicate H1"]
  };

  // Mock parseHtml
  const parseHtml = {
    url,
    headings: ["H1: Example Title", "H2: Subheading"],
    links: ["https://example.com/about", "https://example.com/contact"]
  };

  // Mock detectIntent
  const detectIntent = {
    keyword,
    intent: "Informational"
  };

  // Mock extractSections
  const extractSections = {
    url,
    sections: [
      { heading: "Introduction", content: "This is the intro." },
      { heading: "Features", content: "Feature details here." }
    ]
  };

  res.status(200).json({
    url,
    seoCheck,
    parseHtml,
    detectIntent,
    extractSections
  });
}
