import fetch from "node-fetch";

export async function fetchWithRedirects(targetUrl, headers) {
  let redirectChain = [];
  let currentUrl = targetUrl;
  let finalResponse;

  while (true) {
    const response = await fetch(currentUrl, { headers, redirect: "manual" });
    redirectChain.push({ url: currentUrl, status: response.status });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      currentUrl = new URL(response.headers.get("location"), currentUrl).href;
    } else {
      finalResponse = response;
      break;
    }
  }

  if (!finalResponse.ok) throw new Error(`Request failed with status: ${finalResponse.status}`);
  const html = await finalResponse.text();
  return { html, redirectChain };
}

export default async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 15000
    });

    if (!response.ok) {
      return {
        html: "",
        text: "",
        finalUrl: url,
        status: response.status,
        error: `Fetch failed: ${response.status} ${response.statusText}`
      };
    }

    const html = await response.text();
    // Simple text extraction without JSDOM
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      html,
      text,
      finalUrl: response.url,
      status: response.status
    };
  } catch (err) {
    return {
      html: "",
      text: "",
      finalUrl: url,
      status: 500,
      error: `Network error: ${err.message}`
    };
  }
}
