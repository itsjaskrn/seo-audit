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
