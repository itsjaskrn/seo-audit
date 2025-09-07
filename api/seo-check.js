import { fetchWithRedirects } from "../utils/fetchPage.js";
import { parseHtml } from "../utils/parseHtml.js";
import { detectIntent } from "../utils/detectIntent.js";

export default async function handler(req, res) {
  try {
    const { url, keyword } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url param" });

    const headers = { "User-Agent": "Mozilla/5.0", Accept: "text/html" };
    const { html, redirectChain } = await fetchWithRedirects(url, headers);

    const parsed = await parseHtml(html, url, keyword, headers);
    const intent = detectIntent(parsed.plainText);

    res.json({
      targetUrl: url,
      redirectChain,
      intent,
      ...parsed,
      message: "SEO analysis completed successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
