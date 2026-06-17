export type DnsProvider = {
  id: string;
  name: string;
  servers: string[];
  note: string;
};

export type DnsLatencyResult = {
  server: string;
  latencyMs?: number;
  ok: boolean;
  provider?: string;
  error?: string;
};

export type DnsTestDomain = {
  id: string;
  label: string;
  domain: string;
};

export const publicDnsProviders: DnsProvider[] = [
  {
    id: "alidns",
    name: "阿里 DNS",
    servers: ["223.5.5.5", "223.6.6.6"],
    note: "国内常用，适合大陆网络优先测试。"
  },
  {
    id: "dnspod",
    name: "DNSPod",
    servers: ["119.29.29.29", "182.254.116.116"],
    note: "腾讯公共 DNS，国内访问通常稳定。"
  },
  {
    id: "114dns",
    name: "114DNS",
    servers: ["114.114.114.114", "114.114.115.115"],
    note: "老牌公共 DNS，覆盖广。"
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    servers: ["1.1.1.1", "1.0.0.1"],
    note: "国际网络常用，隐私策略较强。"
  },
  {
    id: "google",
    name: "Google DNS",
    servers: ["8.8.8.8", "8.8.4.4"],
    note: "国际网络常用，在部分网络下延迟可能较高。"
  }
];

export const dnsTestDomains: DnsTestDomain[] = [
  { id: "example", label: "example.com（国际默认）", domain: "example.com" },
  { id: "baidu", label: "baidu.com（国内）", domain: "baidu.com" },
  { id: "bilibili", label: "bilibili.com（国内视频）", domain: "bilibili.com" },
  { id: "google", label: "google.com（国际）", domain: "google.com" },
  { id: "github", label: "github.com（开发）", domain: "github.com" },
];

export const customDnsDomainId = "custom";

export function flattenDnsServers(providers = publicDnsProviders) {
  return providers.flatMap((provider) =>
    provider.servers.map((server) => ({
      server,
      provider: provider.name
    }))
  );
}

export function rankDnsResults(results: DnsLatencyResult[]) {
  return [...results].sort((left, right) => {
    if (left.ok !== right.ok) {
      return left.ok ? -1 : 1;
    }

    return (left.latencyMs ?? Number.POSITIVE_INFINITY) - (right.latencyMs ?? Number.POSITIVE_INFINITY);
  });
}

export function formatDnsServers(servers: string[]) {
  return servers.map((server) => server.trim()).filter(Boolean).join(", ");
}

const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidDomain(value: string) {
  return domainRegex.test(value.trim());
}

export function getDnsTestDomainLabel(domain: string) {
  const preset = dnsTestDomains.find((item) => item.domain === domain);
  return preset ? preset.label : domain;
}
