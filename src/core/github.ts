export type GitHubRange = "weekly" | "monthly";

export type ProxyMode = "system" | "direct" | "manual";

export type ProxySettings = {
  mode: ProxyMode;
  manualProxy: string;
  token: string;
};

export type GitHubRepo = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  url: string;
  description: string;
  translatedDescription?: string;
  language?: string;
  stars: number;
  forks?: number;
  periodStars?: number;
  avatarUrl?: string;
  license?: string;
  topics: string[];
};

export const discoverLanguages = [
  { label: "All", value: "" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Rust", value: "rust" },
  { label: "Go", value: "go" },
  { label: "C#", value: "c%23" },
  { label: "JavaScript", value: "javascript" }
];

export function buildTrendingUrl(range: GitHubRange, language = "") {
  const path = language ? `/trending/${language}` : "/trending";
  return `https://github.com${path}?since=${range}`;
}

export function buildSearchApiUrl(range: GitHubRange, language = "", now = new Date()) {
  const days = range === "weekly" ? 7 : 30;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const date = since.toISOString().slice(0, 10);
  const languageQuery = language ? ` language:${decodeURIComponent(language)}` : "";
  const query = `stars:>50 pushed:>=${date}${languageQuery}`;
  return `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=25`;
}

export function parseTrendingHtml(html: string): GitHubRepo[] {
  const articles = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];

  return articles
    .map((article): GitHubRepo | undefined => {
      const repoMatch = article.match(/href="\/([^/"<>]+)\/([^/"<>]+)"/i);
      if (!repoMatch) {
        return undefined;
      }

      const owner = decodeHtml(repoMatch[1].trim());
      const name = decodeHtml(repoMatch[2].trim());
      const fullName = `${owner}/${name}`;
      const textArticle = cleanText(article);

      return {
        id: fullName,
        owner,
        name,
        fullName,
        url: `https://github.com/${fullName}`,
        description: extractDescription(article),
        language: extractLanguage(article),
        stars: extractLinkedNumber(article, "stargazers"),
        forks: extractLinkedNumber(article, "forks"),
        periodStars: extractPeriodStars(textArticle),
        avatarUrl: `https://github.com/${owner}.png?size=64`,
        topics: []
      };
    })
    .filter((repo): repo is GitHubRepo => Boolean(repo));
}

export function mapSearchApiItems(payload: unknown): GitHubRepo[] {
  const items = isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];

  return items.map((item) => {
    const record = isRecord(item) ? item : {};
    const owner = isRecord(record.owner) ? record.owner : {};
    const fullName = String(record.full_name ?? "");
    const [ownerName, repoName] = fullName.split("/");

    return {
      id: fullName,
      owner: String(owner.login ?? ownerName ?? ""),
      name: String(record.name ?? repoName ?? fullName),
      fullName,
      url: String(record.html_url ?? `https://github.com/${fullName}`),
      description: String(record.description ?? ""),
      language: record.language ? String(record.language) : undefined,
      stars: Number(record.stargazers_count ?? 0),
      forks: Number(record.forks_count ?? 0),
      avatarUrl: owner.avatar_url ? String(owner.avatar_url) : undefined,
      license: isRecord(record.license) && record.license.spdx_id ? String(record.license.spdx_id) : undefined,
      topics: Array.isArray(record.topics) ? record.topics.map(String) : []
    };
  });
}

function extractDescription(article: string) {
  const match = article.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return match ? cleanText(match[1]) : "";
}

function extractLanguage(article: string) {
  const match = article.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i);
  return match ? cleanText(match[1]) : undefined;
}

function extractLinkedNumber(article: string, segment: string) {
  const regex = new RegExp(`/${segment}"[^>]*>([\\s\\S]*?)<\\/a>`, "i");
  const match = article.match(regex);
  return match ? toNumber(cleanText(match[1])) : 0;
}

function extractPeriodStars(text: string) {
  const match = text.match(/([\d,]+)\s+stars?\s+(today|this week|this month)/i);
  return match ? toNumber(match[1]) : undefined;
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toNumber(value: string) {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
