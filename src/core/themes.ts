import sakuraWorkbenchBackgroundUrl from "../../assets/backgrounds/sakura-workbench.png";
import neonTerminalBackgroundUrl from "../../assets/backgrounds/neon-terminal.png";
import azureRooftopBackgroundUrl from "../../assets/backgrounds/azure-rooftop.png";

export type SolidThemeId = "light" | "slate" | "teal" | "rose";
export type ImageThemeId = "sakura" | "neon" | "azure";
export type ThemeId = SolidThemeId | ImageThemeId;

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  accent: string;
  accentSoft: string;
  background: string;
  defaultGlassOpacity: number;
  defaultGlassBlur: number;
  imageBackground?: string;
  textShadow?: string;
};

export const solidThemeIds: SolidThemeId[] = ["light", "slate", "teal", "rose"];
export const imageThemeIds: ImageThemeId[] = ["sakura", "neon", "azure"];

export const themeDefinitions: ThemeDefinition[] = [
  {
    id: "light",
    name: "明亮面板",
    description: "浅色背景 + 清爽面板，最接近 Windows 11 默认风格",
    accent: "#0d9488",
    accentSoft: "#ccfbf1",
    background:
      "radial-gradient(ellipse at 0% 0%, rgba(13, 148, 136, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(59, 130, 246, 0.1) 0%, transparent 45%), #f0f4f8",
    defaultGlassOpacity: 0.72,
    defaultGlassBlur: 28
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
  },
  {
    id: "sakura",
    name: "樱色工位",
    description: "粉白桌面和装机工具氛围，适合浅色面板",
    accent: "#f472b6",
    accentSoft: "#fce7f3",
    background: "#fdf2f8",
    imageBackground: sakuraWorkbenchBackgroundUrl,
    defaultGlassOpacity: 0.62,
    defaultGlassBlur: 24
  },
  {
    id: "neon",
    name: "霓虹终端",
    description: "蓝紫霓虹与命令行元素，科技感更强",
    accent: "#38bdf8",
    accentSoft: "#e0f2fe",
    background: "#0f172a",
    imageBackground: neonTerminalBackgroundUrl,
    defaultGlassOpacity: 0.58,
    defaultGlassBlur: 22
  },
  {
    id: "azure",
    name: "晴空天台",
    description: "清爽蓝天与轻量 Windows 视觉",
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe",
    background: "#f0f9ff",
    imageBackground: azureRooftopBackgroundUrl,
    defaultGlassOpacity: 0.6,
    defaultGlassBlur: 22
  }
];

export function isThemeId(value: string): value is ThemeId {
  return themeDefinitions.some((theme) => theme.id === value);
}

export function isSolidThemeId(value: string): value is SolidThemeId {
  return solidThemeIds.includes(value as SolidThemeId);
}

export function isImageThemeId(value: string): value is ImageThemeId {
  return imageThemeIds.includes(value as ImageThemeId);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeDefinitions.find((theme) => theme.id === themeId) ?? themeDefinitions[0];
}

export function getThemeImageBackgroundUrl(themeId: ThemeId): string | undefined {
  return getThemeDefinition(themeId).imageBackground;
}
