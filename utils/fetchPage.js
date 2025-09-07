import fetch from "node-fetch";
import { JSDOM } from "jsdom";

/**
 * Fetches a webpage and returns its HTML, text, and final URL.
 * Handles redirects, user-agent spoofing, and error logging.
 */
export default async function fetchPage(url) {
  try {
    if (!url) {
      throw new Error("Missing URL");
    }

    // Add realistic browser headers
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      },
      timeout: 15000 // 15s timeout
    });

    // If blocked or error status
    if (!response.ok) {
      throw new Error(
        `Failed to fetch. Status: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Parse with JSDOM
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Get readable text
    const text =
      doc.body?.textContent?.replace(/\s+/g, " ").trim() || "";

    return {
      html,
      text,
      finalUrl: response.url,
      status: response.status
    };
  } catch (error) {
    console.error("fetchPage error:", error.message);

    // Return safe fallback instead of crashing
    return {
      html: "",
      text: "",
      finalUrl: url,
      status: 500,
      error: error.message
    };
  }
}
