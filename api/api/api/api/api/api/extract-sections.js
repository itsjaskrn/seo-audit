export default function handler(req, res) {
  const url = req.query.url || "https://example.com";
  res.status(200).json({
    url,
    sections: [
      { heading: "Introduction", content: "This is the intro." },
      { heading: "Features", content: "Feature details here." }
    ]
  });
}
