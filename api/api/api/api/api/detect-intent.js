export default function handler(req, res) {
  const keyword = req.query.keyword || "seo audit";
  res.status(200).json({
    keyword,
    intent: "Informational"
  });
}
