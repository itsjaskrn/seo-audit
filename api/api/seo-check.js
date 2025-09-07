export default function handler(req, res) {
  const url = req.query.url || "https://example.com";
  res.status(200).json({
    status: "ok",
    input: url,
    seoScore: 85,
    issues: ["Missing meta description", "Duplicate H1"]
  });
}
