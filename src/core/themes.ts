export type ThemeId = "light" | "dark" | "slate" | "teal" | "rose";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  accent: string;
  accentSoft: string;
  background: string;
  defaultGlassOpacity: number;
  defaultGlassBlur: number;
};

export const themeDefinitions: ThemeDefinition[] = [
  {
    id: "light",
    name: "明亮毛玻璃",
    description: "浅色背景 + 半透明面板，最接近 Windows 11 默认风格",
    accent: "#0d9488",
    accentSoft: "#ccfbf1",
    background:
      "radial-gradient(ellipse at 0% 0%, rgba(13, 148, 136, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(59, 130, 246, 0.1) 0%, transparent 45%), #f0f4f8",
    defaultGlassOpacity: 0.72,
    defaultGlassBlur: 28
  },
  {
    id: "dark",
    name: "暗色毛玻璃",
    description: "深蓝灰背景 + 半透明暗面板，适合夜间使用",
    accent: "#14b8a6",
    accentSoft: "#134e4a",
    background:
      "radial-gradient(ellipse at 0% 0%, rgba(20, 184, 166, 0.15) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(59, 130, 246, 0.12) 0%, transparent 45%), #0f172a",
    defaultGlassOpacity: 0.62,
    defaultGlassBlur: 32
  },
  {
    id: "slate",
    name: "石板灰",
    description: "中性灰蓝背景，低调专业",
    accent: "#3b82f6",
    accentSoft: "#dbeafe",
    background:
      "radial-gradient(ellipse at 0% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(100, 116, 139, 0.12) 0%, transparent 45%), #e2e8f0",
    defaultGlassOpacity: 0.74,
    defaultGlassBlur: 26
  },
  {
    id: "teal",
    name: "青绿",
    description: "清新青绿色调，活力自然",
    accent: "#0d9488",
    accentSoft: "#ccfbf1",
    background:
      "radial-gradient(ellipse at 0% 0%, rgba(13, 148, 136, 0.16) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(20, 184, 166, 0.1) 0%, transparent 45%), #f0fdfa",
    defaultGlassOpacity: 0.72,
    defaultGlassBlur: 28
  },
  {
    id: "rose",
    name: "玫瑰",
    description: "柔和玫瑰粉调，温暖现代",
    accent: "#e11d48",
    accentSoft: "#ffe4e6",
    background:
      "radial-gradient(ellipse at 0% 0%, rgba(225, 29, 72, 0.1) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(244, 63, 94, 0.08) 0%, transparent 45%), #fff1f2",
    defaultGlassOpacity: 0.72,
    defaultGlassBlur: 28
  }
];

export function isThemeId(value: string): value is ThemeId {
  return themeDefinitions.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeDefinitions.find((theme) => theme.id === themeId) ?? themeDefinitions[0];
}
