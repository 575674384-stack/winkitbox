const googleTranslateEndpoint = "https://translate.googleapis.com/translate_a/single";

export function buildTranslateUrl(text: string) {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: "zh-CN",
    dt: "t",
    q: text
  });

  return `${googleTranslateEndpoint}?${params.toString()}`;
}

export function parseGoogleTranslatePayload(payload: unknown) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return "";
  }

  return payload[0]
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
    .join("")
    .trim();
}

export function shouldTranslate(text: string) {
  const normalized = text.trim();
  return normalized.length > 0 && !/[\u3400-\u9fff]/.test(normalized);
}
