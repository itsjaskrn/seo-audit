export default function detectIntent(text) {
  const lower = text.toLowerCase();
  if (/(buy|purchase|order|discount|coupon|deal)/.test(lower)) return "Transactional";
  if (/(how to|what is|guide|tutorial|tips|learn)/.test(lower)) return "Informational";
  if (/(login|sign in|homepage|official site)/.test(lower)) return "Navigational";
  if (/(best|compare|review|top|vs|alternative)/.test(lower)) return "Commercial Investigation";
  return "Unknown";
}
