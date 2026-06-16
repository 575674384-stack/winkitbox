export type ThemeId = "default" | "bleach" | "naruto" | "jianlai" | "doraemon";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  accent: string;
};

export const themeDefinitions: ThemeDefinition[] = [
  {
    id: "default",
    name: "默认",
    description: "清爽工具箱默认外观",
    accent: "#0f766e"
  },
  {
    id: "bleach",
    name: "死神",
    description: "黑白冷调、刀影和灵压感",
    accent: "#111827"
  },
  {
    id: "naruto",
    name: "火影",
    description: "橙色热血、夕阳和忍者感",
    accent: "#ea580c"
  },
  {
    id: "jianlai",
    name: "剑来",
    description: "青玉云海、飞剑和中式仙侠感",
    accent: "#047857"
  },
  {
    id: "doraemon",
    name: "哆啦A梦",
    description: "蓝白未来、童趣和道具感",
    accent: "#0284c7"
  }
];

export function isThemeId(value: string): value is ThemeId {
  return themeDefinitions.some((theme) => theme.id === value);
}
