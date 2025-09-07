export default function handler(req, res) {
  const url = req.query.url || "https://example.com";
  res.status(200).json({
    url,
    headings: ["H1: Example Title", "H2: Subheading"],
    links: ["https://example.com/about", "https://example.com/contact"]
  });
}
