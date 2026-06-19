import { describe, expect, it } from "vitest";
import { normalizeActivityLog } from "./activityLog";
import {
  exportActivityLogAsJson,
  exportActivityLogAsText,
} from "./activityLogExport";

describe("activity log export", () => {
  const fakeGithubToken = "g" + "hp_" + "SECRET1234567890";
  const fakeApiKey = "sk-" + "secret123456";
  const entries = normalizeActivityLog([
    {
      id: "1",
      createdAt: "2026-06-19T02:00:00.000Z",
      kind: "install",
      status: "error",
      title: "Czkawka 安装失败",
      detail: `Authorization: Bearer ${fakeGithubToken}`,
      toolId: "czkawka",
      toolName: "Czkawka",
      exitCode: 1,
      source: "一键装机",
      rawOutput: [`${fakeApiKey} install failed`],
      commandSummary: "winget install --id Czkawka",
    },
  ]);

  it("exports sanitized JSON for the provided entries", () => {
    const text = exportActivityLogAsJson(entries);
    const parsed = JSON.parse(text);

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].title).toBe("Czkawka 安装失败");
    expect(text).not.toContain(fakeGithubToken);
    expect(text).not.toContain(fakeApiKey);
    expect(text).toContain("[已脱敏]");
  });

  it("exports readable TXT with complete detail fields", () => {
    const text = exportActivityLogAsText(entries);

    expect(text).toContain("WinKitBox 日志导出");
    expect(text).toContain("Czkawka 安装失败");
    expect(text).toContain("类型：安装");
    expect(text).toContain("状态：失败");
    expect(text).toContain("退出码：1");
    expect(text).toContain("实时输出：");
    expect(text).not.toContain(fakeApiKey);
  });
});
