import { describe, expect, it } from "vitest";
import {
  buildSearchApiUrl,
  buildTrendingUrl,
  filterWindowsRepos,
  mapSearchApiItems,
  normalizeAiRepoRecommendations,
  parseTrendingHtml
} from "./github";

describe("github discovery", () => {
  it("builds GitHub Trending URLs for range and language", () => {
    expect(buildTrendingUrl("weekly")).toBe("https://github.com/trending?since=weekly");
    expect(buildTrendingUrl("monthly", "typescript")).toBe(
      "https://github.com/trending/typescript?since=monthly"
    );
  });

  it("builds a GitHub Search API fallback query for recent repos", () => {
    const url = decodeURIComponent(
      buildSearchApiUrl("weekly", "python", new Date("2026-06-10T00:00:00.000Z"))
    );

    expect(url).toContain("stars:>50 pushed:>=2026-06-03");
    expect(url).toContain("windows");
    expect(url).toContain("desktop");
    expect(url).toContain("language:python");
    expect(url).toContain("sort=stars");
  });

  it("parses trending repository cards from GitHub HTML", () => {
    const html = `
      <article class="Box-row">
        <h2><a href="/owner-one/tool-one"> owner-one / tool-one </a></h2>
        <p class="col-9 color-fg-muted my-1 pr-4">Useful Windows utility</p>
        <span itemprop="programmingLanguage">TypeScript</span>
        <a href="/owner-one/tool-one/stargazers"> 12,345 </a>
        <a href="/owner-one/tool-one/forks"> 567 </a>
        <span class="d-inline-block float-sm-right">123 stars this week</span>
      </article>
    `;

    expect(parseTrendingHtml(html)).toEqual([
      {
        id: "owner-one/tool-one",
        owner: "owner-one",
        name: "tool-one",
        fullName: "owner-one/tool-one",
        url: "https://github.com/owner-one/tool-one",
        description: "Useful Windows utility",
        language: "TypeScript",
        stars: 12345,
        forks: 567,
        periodStars: 123,
        avatarUrl: "https://github.com/owner-one.png?size=64",
        topics: []
      }
    ]);
  });

  it("maps search API items into discovery repos", () => {
    const repos = mapSearchApiItems({
      items: [
        {
          full_name: "sample/repo",
          name: "repo",
          html_url: "https://github.com/sample/repo",
          description: "Sample repo",
          language: "Rust",
          stargazers_count: 900,
          forks_count: 12,
          topics: ["windows", "tools"],
          license: { spdx_id: "MIT" },
          owner: { login: "sample", avatar_url: "https://github.com/sample.png" }
        }
      ]
    });

    expect(repos[0]).toMatchObject({
      fullName: "sample/repo",
      language: "Rust",
      stars: 900,
      forks: 12,
      license: "MIT",
      topics: ["windows", "tools"]
    });
  });

  it("filters discovery results to likely Windows applications", () => {
    const repos = filterWindowsRepos([
      {
        id: "one",
        owner: "sample",
        name: "win-tool",
        fullName: "sample/win-tool",
        url: "https://github.com/sample/win-tool",
        description: "Windows desktop utility",
        language: "C#",
        stars: 100,
        topics: ["windows", "desktop-app"]
      },
      {
        id: "two",
        owner: "sample",
        name: "linux-tool",
        fullName: "sample/linux-tool",
        url: "https://github.com/sample/linux-tool",
        description: "Linux daemon",
        language: "Go",
        stars: 100,
        topics: ["linux"]
      }
    ]);

    expect(repos.map((repo) => repo.fullName)).toEqual(["sample/win-tool"]);
  });

  it("normalizes AI GitHub recommendations and rejects non-GitHub links", () => {
    const recommendations = normalizeAiRepoRecommendations({
      recommendations: [
        {
          name: "Power Toys",
          repoUrl: "https://github.com/microsoft/PowerToys",
          summary: "Windows efficiency toolkit with launchers and utilities",
          reason: "Matches the requested workflow automation need",
          language: "C#",
          stars: "110000",
          tags: ["windows", "utilities", "desktop", "extra"]
        },
        {
          name: "Bad Link",
          repoUrl: "https://example.com/download",
          summary: "Not a GitHub project"
        }
      ]
    });

    expect(recommendations).toEqual([
      {
        id: "microsoft/PowerToys",
        owner: "microsoft",
        name: "PowerToys",
        fullName: "microsoft/PowerToys",
        url: "https://github.com/microsoft/PowerToys",
        description: "Windows efficiency toolkit with launchers and utilities",
        reason: "Matches the requested workflow automation need",
        language: "C#",
        stars: 110000,
        license: undefined,
        topics: ["windows", "utilities", "desktop"]
      }
    ]);
  });
});
