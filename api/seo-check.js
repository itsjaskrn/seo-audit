import { fetchWithRedirects } from "../utils/fetchPage.js";
import parseHtml from "../utils/parseHtml.js";
import detectIntent from "../utils/detectIntent.js";

export default async function handler(req, res) {
  try {
    const { url, keyword } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url param" });

    // Add protocol if missing
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = 'https://' + url;
    }

    const headers = { "User-Agent": "Mozilla/5.0", Accept: "text/html" };
    const { html, redirectChain } = await fetchWithRedirects(targetUrl, headers);

    const parsed = await parseHtml(html);
    const intent = keyword ? detectIntent(keyword) : null;

    res.json({
      targetUrl: targetUrl,
      redirectChain,
      intent,
      ...parsed,
      message: "SEO analysis completed successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
