import * as cheerio from "cheerio";

export function extractSections(html) {
  const $ = cheerio.load(html);
  const sections = [];

  $("h1,h2,h3,h4,h5,h6").each((i, el) => {
    const headingTag = el.tagName.toLowerCase();
    const headingText = $(el).text().trim();
    const content = $(el).nextUntil("h1,h2,h3,h4,h5,h6").text().trim();
    sections.push({ headingTag, headingText, content });
  });

  return sections;
}
