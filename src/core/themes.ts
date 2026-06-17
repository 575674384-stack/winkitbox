export type ThemeId = "light" | "slate" | "teal" | "rose";
export type BuiltinThemeBackgroundId =
  | "sakura-workbench"
  | "neon-terminal"
  | "azure-rooftop";

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

export type BuiltinThemeBackgroundDefinition = {
  id: BuiltinThemeBackgroundId;
  name: string;
  description: string;
  accent: string;
};

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
  }
];

export const builtinThemeBackgrounds: BuiltinThemeBackgroundDefinition[] = [
  {
    id: "sakura-workbench",
    name: "樱色工位",
    description: "粉白桌面和装机工具氛围，适合浅色面板",
    accent: "#f472b6"
  },
  {
    id: "neon-terminal",
    name: "霓虹终端",
    description: "蓝紫霓虹与命令行元素，科技感更强",
    accent: "#38bdf8"
  },
  {
    id: "azure-rooftop",
    name: "晴空天台",
    description: "清爽蓝天与轻量 Windows 视觉",
    accent: "#0ea5e9"
  }
];

const builtinThemeBackgroundPrefix = "builtin:";

export function isThemeId(value: string): value is ThemeId {
  return themeDefinitions.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeDefinitions.find((theme) => theme.id === themeId) ?? themeDefinitions[0];
}

export function isBuiltinThemeBackgroundId(value: string): value is BuiltinThemeBackgroundId {
  return builtinThemeBackgrounds.some((background) => background.id === value);
}

export function createBuiltinThemeBackgroundValue(backgroundId: BuiltinThemeBackgroundId) {
  return `${builtinThemeBackgroundPrefix}${backgroundId}` as const;
}

export function getBuiltinThemeBackgroundId(value?: string) {
  if (!value?.startsWith(builtinThemeBackgroundPrefix)) {
    return undefined;
  }

  const backgroundId = value.slice(builtinThemeBackgroundPrefix.length);
  return isBuiltinThemeBackgroundId(backgroundId) ? backgroundId : undefined;
}
