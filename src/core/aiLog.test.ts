import { describe, expect, it } from "vitest";
import {
  addAiLogEntry,
  exportAiLogAsText,
  filterAiLogEntries,
  normalizeAiLog,
  type AiLogInput,
} from "./aiLog";

describe("AI log", () => {
  it("keeps detailed AI replies while redacting secrets", () => {
    const entries = normalizeAiLog([
      {
        id: "ai-1",
        createdAt: "2026-06-20T10:00:00.000Z",
        kind: "recommendation",
        status: "success",
        title: "GitHub 项目推荐",
        prompt: "推荐下载工具",
        response:
          "可考虑 Flow Launcher。Authorization: Bearer sk-test-secret-token-123456",
        model: "gpt-test",
        source: "GitHub AI 助手",
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].response).toContain("Flow Launcher");
    expect(entries[0].response).not.toContain("sk-test-secret-token");
    expect(entries[0].model).toBe("gpt-test");
  });

  it("adds newest entries first and filters by query, kind, status, and tool", () => {
    const first: AiLogInput = {
      kind: "repair",
      status: "error",
      title: "AI 修复失败",
      response: "无法修复 Czkawka",
      toolId: "czkawka",
      toolName: "Czkawka",
    };
    const second: AiLogInput = {
      kind: "tool-analysis",
      status: "success",
      title: "链接分析",
      response: "生成 LocalSend 工具候选",
      repoUrl: "https://github.com/localsend/localsend",
    };

    const entries = addAiLogEntry(
      addAiLogEntry([], first, new Date("2026-06-20T10:00:00.000Z")),
      second,
      new Date("2026-06-20T11:00:00.000Z"),
    );

    expect(entries.map((entry) => entry.title)).toEqual(["链接分析", "AI 修复失败"]);
    expect(filterAiLogEntries(entries, { query: "localsend" })).toHaveLength(1);
    expect(filterAiLogEntries(entries, { status: "error" })).toHaveLength(1);
    expect(filterAiLogEntries(entries, { kind: "repair" })[0].toolId).toBe("czkawka");
  });

  it("exports readable text for copy and txt export", () => {
    const [entry] = normalizeAiLog([
      {
        kind: "local-analysis",
        status: "success",
        title: "本地文件分析",
        prompt: "C:\\Tools\\foo.zip",
        response: "识别为 ZIP 便携包。",
        structured: { mode: "local-archive" },
      },
    ]);

    expect(exportAiLogAsText([entry])).toContain("本地文件分析");
    expect(exportAiLogAsText([entry])).toContain("识别为 ZIP 便携包。");
    expect(exportAiLogAsText([entry])).toContain("local-archive");
  });
});
