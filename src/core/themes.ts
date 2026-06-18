import azureRooftopBackgroundUrl from "../../assets/backgrounds/azure-rooftop.png";
import amberStudioBackgroundUrl from "../../assets/backgrounds/amber-studio.png";
import mintWorkbenchBackgroundUrl from "../../assets/backgrounds/mint-workbench.png";

export type ThemeId = "azure" | "mint" | "amber";

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

export const themeDefinitions: ThemeDefinition[] = [
  {
    id: "azure",
    name: "晴空天台",
    description: "清爽蓝天与轻量 Windows 视觉",
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe",
    background: "#f0f9ff",
    imageBackground: azureRooftopBackgroundUrl,
    defaultGlassOpacity: 0.55,
    defaultGlassBlur: 20
  },
  {
    id: "mint",
    name: "浅绿工位",
    description: "浅绿色工位与工具桌，清透柔和",
    accent: "#16a34a",
    accentSoft: "#dcfce7",
    background: "#f0fdf4",
    imageBackground: mintWorkbenchBackgroundUrl,
    defaultGlassOpacity: 0.68,
    defaultGlassBlur: 18
  },
  {
    id: "amber",
    name: "暖黄工坊",
    description: "浅黄色阳光工坊，温暖明亮",
    accent: "#d97706",
    accentSoft: "#fef3c7",
    background: "#fffbeb",
    imageBackground: amberStudioBackgroundUrl,
    defaultGlassOpacity: 0.70,
    defaultGlassBlur: 18
  }
];

export const defaultThemeId: ThemeId = "azure";

export function isThemeId(value: string): value is ThemeId {
  return themeDefinitions.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeDefinitions.find((theme) => theme.id === themeId) ?? themeDefinitions[0];
}

export function getThemeImageBackgroundUrl(themeId: ThemeId): string | undefined {
  return getThemeDefinition(themeId).imageBackground;
}
