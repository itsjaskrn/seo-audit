import * as cheerio from "cheerio";

export default async function parseHtml(html) {
  const $ = cheerio.load(html);

  // Title
  const title = $("title").text().trim() || "";

  // Track description + source
  let description = "";
  let descriptionSource = "missing";

  if ($("meta[name='description']").length) {
    description = $("meta[name='description']").attr("content")?.trim() || "";
    descriptionSource = "meta";
  } else if ($("meta[property='og:description']").length) {
    description = $("meta[property='og:description']").attr("content")?.trim() || "";
    descriptionSource = "openGraph";
  } else if ($("meta[name='twitter:description']").length) {
    description = $("meta[name='twitter:description']").attr("content")?.trim() || "";
    descriptionSource = "twitter";
  }

  // H1 tags
  const h1s = $("h1").map((i, el) => $(el).text().trim()).get();

  // Links
  const links = $("a").map((i, el) => $(el).attr("href")).get().filter(Boolean);

  // Issues
  const issues = [];
  if (descriptionSource === "missing") {
    issues.push("Missing meta description");
  } else if (descriptionSource !== "meta") {
    issues.push(`Description found in ${descriptionSource}, not in <meta name="description">`);
  }
  if (h1s.length > 1) issues.push("Duplicate H1 tags");

  return {
    seoScore: 85 - issues.length * 5,
    title,
    description,
    descriptionSource, // ✅ tells you where it came from
    h1s,
    links,
    issues
  };
}
