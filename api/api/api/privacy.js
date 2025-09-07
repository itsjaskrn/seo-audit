export default function handler(req, res) {
  res.status(200).json({
    privacy: "We do not collect personal data. SEO checks are processed server-side only."
  });
}
