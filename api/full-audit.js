export default async function handler(req, res) {
  const url = req.query.url;
  const keyword = req.query.keyword || "";
  const userAgent = req.query['user-agent'] || 'chrome';

  if (!url) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  try {
    // Call comprehensive Cloudflare Worker
    const workerUrl = `https://seo-audit.itsjaskrn.workers.dev/?url=${encodeURIComponent(url)}`;
    const finalUrl = keyword ? `${workerUrl}&keyword=${encodeURIComponent(keyword)}` : workerUrl;
    const userAgentUrl = `${finalUrl}&user-agent=${userAgent}`;
    
    const workerResponse = await fetch(userAgentUrl);
    const workerData = await workerResponse.json();

    if (workerData.error) {
      return res.status(502).json({
        error: "Worker fetch failed",
        details: workerData.error
      });
    }

    // Return all data from Cloudflare Worker
    return res.status(200).json(workerData);

  } catch (err) {
    console.error("Full audit failed:", err);
    return res.status(500).json({
      error: "SEO audit failed",
      details: err.message
    });
  }
}
