import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const url = req.query.url;
  const keyword = req.query.keyword || "";

  if (!url) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  try {
    // Call Cloudflare Worker
    const workerResponse = await fetch(
      `https://seo-audit.itsjaskrn.workers.dev/?url=${encodeURIComponent(url)}`
    );
    const workerData = await workerResponse.json();

    if (!workerData.ok) {
      return res.status(502).json({
        error: "Worker fetch failed",
        details: workerData.error || "Unknown error"
      });
    }

    const html = workerData.html;
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $("title").text().trim() || "";
    let descriptionSource = "missing";
    let description =
      $("meta[name='description']").attr("content")?.trim() ||
      $("meta[property='og:description']").attr("content")?.trim() ||
      $("meta[name='twitter:description']").attr("content")?.trim() ||
      "";

    if ($("meta[name='description']").length) descriptionSource = "meta";
    else if ($("meta[property='og:description']").length) descriptionSource = "openGraph";
    else if ($("meta[name='twitter:description']").length) descriptionSource = "twitter";

    // Extract H1s
    const h1s = [];
    $("h1").each((i, el) => h1s.push($(el).text().trim()));

    // Extract links
    const links = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href) links.push(href);
    });

    // Extract sections
    const sections = [];
    $("h1, h2, h3").each((i, el) => {
      const heading = $(el).text().trim();
      const next = $(el).nextUntil("h1, h2, h3");
      const content = next.text().trim();
      sections.push({ heading, content });
    });

    // Detect intent (very simple demo)
    let intent = "Informational";
    if (keyword) {
      if (keyword.toLowerCase().includes("buy") || html.includes("price")) {
        intent = "Transactional";
      } else if (keyword.toLowerCase().includes("near me") || keyword.toLowerCase().includes("contact")) {
        intent = "Navigational";
      }
    }

    // Issues
    const issues = [];
    if (descriptionSource === "missing") {
      issues.push("Missing meta description");
    } else if (descriptionSource !== "meta") {
      issues.push(`Description found in ${descriptionSource}, not in <meta name='description'>`);
    }
    if (h1s.length > 1) issues.push("Duplicate H1 tags");

    // Score
    const seoScore = 85 - issues.length * 5;

    return res.status(200).json({
      url: workerData.finalUrl,
      status: workerData.status,
      title,
      description,
      descriptionSource,
      h1s,
      links,
      sections,
      intent,
      seoScore,
      issues
    });

  } catch (err) {
    console.error("Full audit failed:", err);
    return res.status(500).json({
      error: "SEO audit failed",
      details: err.message
    });
  }
}
