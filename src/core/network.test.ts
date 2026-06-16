import { describe, expect, it } from "vitest";
import { flattenDnsServers, formatDnsServers, publicDnsProviders, rankDnsResults } from "./network";

describe("network helpers", () => {
  it("provides public DNS candidates for latency tests", () => {
    const servers = flattenDnsServers(publicDnsProviders).map((item) => item.server);

    expect(servers).toContain("223.5.5.5");
    expect(servers).toContain("1.1.1.1");
    expect(servers.length).toBeGreaterThanOrEqual(8);
  });

  it("ranks healthy DNS servers before failed or slow servers", () => {
    const ranked = rankDnsResults([
      { server: "8.8.8.8", ok: true, latencyMs: 80 },
      { server: "1.1.1.1", ok: false },
      { server: "223.5.5.5", ok: true, latencyMs: 15 }
    ]);

    expect(ranked.map((item) => item.server)).toEqual(["223.5.5.5", "8.8.8.8", "1.1.1.1"]);
  });

  it("formats DNS server input for PowerShell calls", () => {
    expect(formatDnsServers([" 223.5.5.5 ", "", "1.1.1.1"])).toBe("223.5.5.5, 1.1.1.1");
  });
});
