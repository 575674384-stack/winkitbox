import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Github,
  Globe2,
  Inbox,
  Languages,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  WifiOff,
  Zap
} from "lucide-react";
import {
  buildSearchApiUrl,
  buildTrendingUrl,
  discoverLanguages,
  filterWindowsRepos,
  mapSearchApiItems,
  parseTrendingHtml,
  type GitHubRange,
  type GitHubRepo,
  type ProxySettings
} from "./core/github";
import {
  customAddCategoryId,
  getCategoryName,
  type CategoryDefinition
} from "./core/catalog";
import { buildTranslateUrl, parseGoogleTranslatePayload, shouldTranslate } from "./core/translation";

type DiscoverViewProps = {
  categories: CategoryDefinition[];
  defaultCategoryId: string;
  onAddRepoWithAi: (repoUrl: string, categoryId: string) => Promise<void>;
  onOpenUrl: (url: string) => Promise<void>;
};

type FetchState = "idle" | "loading" | "ready" | "cached" | "error";

const settingsKey = "winkitbox:github-settings:v1";
const translatePreferenceKey = "winkitbox:github-translate:v1";

export function DiscoverView({
  categories,
  defaultCategoryId,
  onAddRepoWithAi,
  onOpenUrl
}: DiscoverViewProps) {
  const [range, setRange] = useState<GitHubRange>("weekly");
  const [language, setLanguage] = useState("");
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [status, setStatus] = useState<FetchState>("idle");
  const [message, setMessage] = useState("准备读取 GitHub 榜单。");
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [settings, setSettings] = useState<ProxySettings>(() => loadSettings());
  const [translateDescriptions, setTranslateDescriptions] = useState(() => loadTranslatePreference());
  const [addCategoryId, setAddCategoryId] = useState(defaultCategoryId);
  const [addingRepo, setAddingRepo] = useState<string>();

  const filteredRepos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return repos;
    }

    return repos.filter((repo) =>
      [repo.fullName, repo.description, repo.translatedDescription, repo.language, repo.license, ...repo.topics]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, repos]);

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(translatePreferenceKey, JSON.stringify(translateDescriptions));

    if (
      translateDescriptions &&
      repos.some((repo) => shouldTranslate(repo.description) && !repo.translatedDescription)
    ) {
      void translateLoadedDescriptions();
    }
  }, [translateDescriptions]);

  useEffect(() => {
    void refreshTrending();
  }, [range, language]);

  useEffect(() => {
    if (!categories.some((category) => category.id === addCategoryId)) {
      setAddCategoryId(defaultCategoryId || customAddCategoryId);
    }
  }, [addCategoryId, categories, defaultCategoryId]);

  async function refreshTrending() {
    setStatus("loading");
    setMessage("正在访问 GitHub。");

    try {
      let nextRepos = filterWindowsRepos(await fetchTrendingRepos(range, language, settings));

      if (translateDescriptions) {
        setMessage("正在翻译项目简介。");
        nextRepos = await translateRepoDescriptions(nextRepos, settings);
      }

      setRepos(nextRepos);
      setFetchedAt(new Date().toLocaleString());
      setStatus("ready");
      setMessage(
        [
          window.winKitBox
            ? "已从 GitHub 实时更新，仅显示 Windows 应用相关项目。"
            : "浏览器预览使用 GitHub API 查询；桌面版支持代理。",
          translateDescriptions ? "项目简介已自动翻译为中文。" : ""
        ]
          .filter(Boolean)
          .join(" ")
      );
      saveCache(range, language, nextRepos);
    } catch (error) {
      const cached = loadCache(range, language);

      if (cached) {
        setRepos(cached.repos);
        setFetchedAt(new Date(cached.fetchedAt).toLocaleString());
        setStatus("cached");
        setMessage(`实时访问失败，已显示缓存。${toMessage(error)}`);
        return;
      }

      setRepos([]);
      setStatus("error");
      setMessage(toMessage(error));
    }
  }

  async function testGitHubConnection() {
    setStatus("loading");
    setMessage("正在测试 GitHub 连接。");

    try {
      const response = await fetchGitHubText("https://api.github.com/rate_limit", settings);
      const remain = response.headers["x-ratelimit-remaining"];
      setStatus("ready");
      setMessage(remain ? `连接正常，API 剩余请求 ${remain} 次。` : "连接正常。");
    } catch (error) {
      setStatus("error");
      setMessage(toMessage(error));
    }
  }

  async function translateLoadedDescriptions() {
    setStatus("loading");
    setMessage("正在翻译项目简介。");

    const translatedRepos = await translateRepoDescriptions(repos, settings);
    setRepos(translatedRepos);
    saveCache(range, language, translatedRepos);
    setStatus("ready");
    setMessage("项目简介已自动翻译为中文。");
  }

  function addCandidate(repo: GitHubRepo) {
    const key = "winkitbox:github-candidates:v1";
    const current = JSON.parse(localStorage.getItem(key) ?? "[]") as GitHubRepo[];
    const next = [repo, ...current.filter((item) => item.fullName !== repo.fullName)].slice(0, 80);
    localStorage.setItem(key, JSON.stringify(next));
    setMessage(`${repo.fullName} 已加入候选清单。`);
  }

  async function copyCloneCommand(repo: GitHubRepo) {
    await navigator.clipboard.writeText(`git clone ${repo.url}.git`);
    setMessage(`已复制 ${repo.fullName} 的 clone 命令。`);
  }

  async function addRepoWithAi(repo: GitHubRepo) {
    setAddingRepo(repo.fullName);
    setMessage(`正在让 AI 分析 ${repo.fullName}。`);

    try {
      await onAddRepoWithAi(repo.url, addCategoryId);
      setStatus("ready");
      setMessage(`${repo.fullName} 已添加到 ${getCategoryName(addCategoryId, categories)}。`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "AI 添加工具失败。");
    } finally {
      setAddingRepo(undefined);
    }
  }

  return (
    <section className="discover-view">
      <header className="command-bar discover-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon discover-icon">
            <Github size={22} />
          </div>
          <div>
            <p className="eyebrow">发现好项目</p>
            <h2>GitHub 周榜 / 月榜</h2>
          </div>
        </div>
        <button className="primary-button" type="button" onClick={refreshTrending} disabled={status === "loading"}>
          <RefreshCw size={16} className={status === "loading" ? "spin" : ""} />
          刷新榜单
        </button>
      </header>

      <div className="discover-layout">
        <div className="discover-main">
          <div className="discover-controls">
            <div className="segmented-control" aria-label="榜单周期">
              {(["weekly", "monthly"] as const).map((item) => (
                <button
                  className={range === item ? "active" : ""}
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                >
                  <CalendarDays size={15} />
                  {item === "weekly" ? "周榜" : "月榜"}
                </button>
              ))}
            </div>

            <div className="language-strip" aria-label="语言筛选">
              {discoverLanguages.map((item) => (
                <button
                  className={language === item.value ? "active" : ""}
                  key={item.label}
                  type="button"
                  onClick={() => setLanguage(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="search-row discover-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索 repo、语言、topics"
              />
            </div>
          </div>

          <div className={`status-line ${status}`}>
            <Globe2 size={16} />
            <span>{message}</span>
            {fetchedAt && <strong>{fetchedAt}</strong>}
          </div>

          {filteredRepos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {status === "error" ? <WifiOff size={28} /> : <Inbox size={28} />}
              </div>
              <h4>{status === "error" ? "无法获取 GitHub 榜单" : "没有匹配的项目"}</h4>
              <p>
                {status === "error"
                  ? "可能是网络或代理问题，可以尝试切换代理模式后重新刷新。"
                  : "当前筛选和搜索条件下没有项目，试试其他语言或清除搜索。"}
              </p>
              <button className="secondary-button" type="button" onClick={refreshTrending} disabled={status === "loading"}>
                <RefreshCw size={14} className={status === "loading" ? "spin" : ""} />
                刷新榜单
              </button>
            </div>
          ) : (
            <div className="repo-grid">
              {filteredRepos.map((repo, index) => (
                <article className="repo-card" key={repo.fullName}>
                  <div className="repo-rank">#{index + 1}</div>
                  <div className="repo-header">
                    <img src={repo.avatarUrl ?? `https://github.com/${repo.owner}.png?size=64`} alt="" />
                    <div className="repo-title">
                      <h3>{repo.fullName}</h3>
                      <p>{repo.language ?? "Unknown"}</p>
                    </div>
                  </div>
                  <div className="repo-description">
                    <p>
                      {(translateDescriptions && repo.translatedDescription) ||
                        repo.description ||
                        "这个项目没有填写简介。"}
                    </p>
                    {translateDescriptions && repo.translatedDescription && repo.description && (
                      <small>{repo.description}</small>
                    )}
                  </div>
                  {repo.topics.length > 0 && (
                    <div className="topic-row">
                      {repo.topics.slice(0, 4).map((topic) => (
                        <span key={topic}>{topic}</span>
                      ))}
                    </div>
                  )}
                  <div className="repo-footer">
                  <div className="repo-meta">
                    <span>
                      <Star size={14} />
                      {formatNumber(repo.stars)}
                    </span>
                    {repo.periodStars !== undefined && (
                      <span className="trending">
                        <Zap size={14} />
                        +{formatNumber(repo.periodStars)}
                      </span>
                    )}
                    {repo.license && <span>{repo.license}</span>}
                  </div>
                  <div className="repo-actions">
                    <button className="mini-action open" type="button" onClick={() => onOpenUrl(repo.url)}>
                      <ExternalLink size={14} />
                      GitHub
                    </button>
                    <button className="mini-action" type="button" onClick={() => addCandidate(repo)}>
                      <ShieldCheck size={14} />
                      候选
                    </button>
                    <button
                      className="mini-action install"
                      type="button"
                      disabled={addingRepo === repo.fullName}
                      onClick={() => addRepoWithAi(repo)}
                    >
                      <Plus size={14} />
                      {addingRepo === repo.fullName ? "添加中" : "AI 添加"}
                    </button>
                    <button className="icon-button" type="button" aria-label="复制 clone 命令" onClick={() => copyCloneCommand(repo)}>
                      <Copy size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )}
        </div>

        <aside className="network-panel">
          <div className="network-card">
            <div className="section-title">
              <Github size={16} />
              GitHub 网络
            </div>
            <div className="proxy-options">
              {(["system", "direct", "manual"] as const).map((mode) => (
                <button
                  className={settings.mode === mode ? "active" : ""}
                  key={mode}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, mode }))}
                >
                  {mode === "system" ? "系统代理" : mode === "direct" ? "直连" : "手动代理"}
                </button>
              ))}
            </div>
            <label className="field-label">
              手动代理
              <input
                value={settings.manualProxy}
                onChange={(event) => setSettings((current) => ({ ...current, manualProxy: event.target.value }))}
                placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:7890"
              />
            </label>
            <label className="field-label">
              GitHub Token
              <input
                value={settings.token}
                type="password"
                onChange={(event) => setSettings((current) => ({ ...current, token: event.target.value }))}
                placeholder="可选，用于提升 API 限额"
              />
            </label>
            <label className="setting-row">
              <input
                checked={translateDescriptions}
                type="checkbox"
                onChange={(event) => setTranslateDescriptions(event.target.checked)}
              />
              <span>
                <Languages size={16} />
                自动翻译成中文
              </span>
            </label>
            <label className="field-label">
              默认添加分类
              <select
                value={addCategoryId}
                onChange={(event) => setAddCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button full-width" type="button" onClick={testGitHubConnection}>
              <Globe2 size={16} />
              测试连接
            </button>
            <p className="network-note">
              桌面版支持系统代理和手动代理；浏览器预览只能尝试直连 GitHub API。
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

async function fetchTrendingRepos(range: GitHubRange, language: string, settings: ProxySettings) {
  const response = await fetchGitHubText(buildSearchApiUrl(range, language), settings);
  return mapSearchApiItems(JSON.parse(response.text));
}

async function translateRepoDescriptions(repos: GitHubRepo[], settings: ProxySettings) {
  const translatedRepos = [...repos];

  for (let index = 0; index < translatedRepos.length; index += 4) {
    const chunk = translatedRepos.slice(index, index + 4);
    const translatedChunk = await Promise.all(
      chunk.map(async (repo) => {
        if (!shouldTranslate(repo.description) || repo.translatedDescription) {
          return repo;
        }

        try {
          const translatedDescription = await fetchTranslatedText(repo.description, settings);
          return translatedDescription ? { ...repo, translatedDescription } : repo;
        } catch {
          return repo;
        }
      })
    );

    translatedChunk.forEach((repo, offset) => {
      translatedRepos[index + offset] = repo;
    });
  }

  return translatedRepos;
}

async function fetchGitHubText(url: string, settings: ProxySettings) {
  if (window.winKitBox) {
    const response = await window.winKitBox.fetchGitHub({
      url,
      proxy: {
        mode: settings.mode,
        manualProxy: settings.manualProxy
      },
      token: settings.token
    });

    if (!response.ok) {
      throw new Error(`GitHub 请求失败：HTTP ${response.status}`);
    }

    return response;
  }

  const response = await fetch(url, {
    headers: settings.token ? { Authorization: `Bearer ${settings.token}` } : undefined
  });

  if (!response.ok) {
    throw new Error(`GitHub 请求失败：HTTP ${response.status}`);
  }

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
    headers: {
      "x-ratelimit-remaining": response.headers.get("x-ratelimit-remaining") ?? ""
    }
  };
}

async function fetchTranslatedText(text: string, settings: ProxySettings) {
  const url = buildTranslateUrl(text);

  if (window.winKitBox) {
    const response = await window.winKitBox.translateText({
      url,
      proxy: {
        mode: settings.mode,
        manualProxy: settings.manualProxy
      }
    });

    if (!response.ok) {
      throw new Error(`翻译请求失败：HTTP ${response.status}`);
    }

    return parseGoogleTranslatePayload(JSON.parse(response.text));
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`翻译请求失败：HTTP ${response.status}`);
  }

  return parseGoogleTranslatePayload(await response.json());
}

function loadSettings(): ProxySettings {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey) ?? "{}") as Partial<ProxySettings>;
    return {
      mode: stored.mode ?? "system",
      manualProxy: stored.manualProxy ?? "",
      token: stored.token ?? ""
    };
  } catch {
    return {
      mode: "system",
      manualProxy: "",
      token: ""
    };
  }
}

function loadTranslatePreference() {
  try {
    const stored = localStorage.getItem(translatePreferenceKey);
    return stored === null ? true : JSON.parse(stored) === true;
  } catch {
    return true;
  }
}

function saveCache(range: GitHubRange, language: string, repos: GitHubRepo[]) {
  localStorage.setItem(
    getCacheKey(range, language),
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      repos
    })
  );
}

function loadCache(range: GitHubRange, language: string): { fetchedAt: string; repos: GitHubRepo[] } | undefined {
  try {
    const raw = localStorage.getItem(getCacheKey(range, language));
    return raw ? (JSON.parse(raw) as { fetchedAt: string; repos: GitHubRepo[] }) : undefined;
  } catch {
    return undefined;
  }
}

function getCacheKey(range: GitHubRange, language: string) {
  return `winkitbox:github-cache:${range}:${language || "all"}`;
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : "GitHub 访问失败。";
}

function formatNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return `${value}`;
}
