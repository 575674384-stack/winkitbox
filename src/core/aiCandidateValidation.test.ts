import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
  validateAiToolCandidate,
  validateDownloadUrl,
} = require("../../electron/aiCandidateValidation.cjs") as {
  validateAiToolCandidate: (
    candidate: unknown,
    context: unknown,
    fetchLike: (url: string, options: unknown) => Promise<unknown>,
  ) => Promise<{ ok: boolean; issues: string[] }>;
  validateDownloadUrl: (
    url: string,
    fetchLike: (url: string, options: unknown) => Promise<unknown>,
  ) => Promise<{ ok: boolean; message?: string }>;
};

function mockResponse({
  ok,
  status,
  headers = {},
  body = "",
}: {
  ok: boolean;
  status: number;
  headers?: Record<string, string>;
  body?: string;
}) {
  return {
    ok,
    status,
    headers: {
      get(name: string) {
        return headers[name] ?? headers[name.toLowerCase()] ?? "";
      },
    },
    text: async () => body,
  };
}

describe("AI candidate download validation", () => {
  it("rejects stale download URLs that return an error body", async () => {
    const fetchLike = vi
      .fn()
      .mockRejectedValueOnce(new Error("HEAD not allowed"))
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          status: 200,
          headers: { "content-type": "application/json" },
          body: '{"errorcode":-46628,"errormsg":"file not exist"}',
        }),
      );

    const result = await validateDownloadUrl("https://example.com/WeType_Setup.exe", fetchLike);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("file not exist");
  });

  it("accepts binary installer responses from HEAD probes", async () => {
    const fetchLike = vi.fn().mockResolvedValueOnce(
      mockResponse({
        ok: true,
        status: 200,
        headers: {
          "content-type": "application/x-msdownload",
          "content-length": "102400",
        },
      }),
    );

    const result = await validateDownloadUrl("https://example.com/setup.exe", fetchLike);

    expect(result.ok).toBe(true);
    expect(fetchLike).toHaveBeenCalledTimes(1);
  });

  it("validates release asset patterns against the matched asset URL", async () => {
    const fetchLike = vi.fn().mockResolvedValueOnce(
      mockResponse({
        ok: true,
        status: 200,
        headers: { "content-type": "application/zip" },
      }),
    );

    const result = await validateAiToolCandidate(
      {
        install: {
          type: "portable",
          assetPattern: "win64\\.zip$",
        },
      },
      {
        assets: [
          {
            name: "tool-win64.zip",
            downloadUrl: "https://github.com/owner/repo/releases/download/v1/tool-win64.zip",
          },
        ],
      },
      fetchLike,
    );

    expect(result.ok).toBe(true);
    expect(fetchLike).toHaveBeenCalledWith(
      "https://github.com/owner/repo/releases/download/v1/tool-win64.zip",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("rejects installer or portable candidates without a reachable download target", async () => {
    const result = await validateAiToolCandidate(
      {
        install: {
          type: "installer",
          assetPattern: "windows\\.exe$",
        },
      },
      { assets: [] },
      vi.fn(),
    );

    expect(result.ok).toBe(false);
    expect(result.issues[0]).toContain("没有找到匹配");
  });
});
