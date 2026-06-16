import { describe, expect, it } from "vitest";
import { buildTranslateUrl, parseGoogleTranslatePayload, shouldTranslate } from "./translation";

describe("translation helpers", () => {
  it("builds a Chinese translation request for Google translate", () => {
    const url = buildTranslateUrl("A collective list of free APIs");

    expect(url).toContain("https://translate.googleapis.com/translate_a/single");
    expect(url).toContain("tl=zh-CN");
    expect(url).toContain("q=A+collective+list+of+free+APIs");
  });

  it("parses translated text from Google translate payload", () => {
    const payload = [[["免费 API 的集合列表", "A collective list of free APIs", null, null]]];

    expect(parseGoogleTranslatePayload(payload)).toBe("免费 API 的集合列表");
  });

  it("skips empty text and existing Chinese text", () => {
    expect(shouldTranslate("")).toBe(false);
    expect(shouldTranslate("这个项目没有填写简介。")).toBe(false);
    expect(shouldTranslate("Useful Windows utility")).toBe(true);
  });
});
