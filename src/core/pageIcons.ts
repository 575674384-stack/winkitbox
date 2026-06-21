import addToolIconUrl from "../../assets/page-icons/add-tool.png";
import catalogIconUrl from "../../assets/page-icons/catalog.png";
import logsIconUrl from "../../assets/page-icons/logs.png";
import notesIconUrl from "../../assets/page-icons/notes.png";
import settingsIconUrl from "../../assets/page-icons/settings.png";
import systemIconUrl from "../../assets/page-icons/system.png";
import updatesIconUrl from "../../assets/page-icons/updates.png";

const pageIcons = {
  catalog: catalogIconUrl,
  system: systemIconUrl,
  addTool: addToolIconUrl,
  updates: updatesIconUrl,
  notes: notesIconUrl,
  logs: logsIconUrl,
  settings: settingsIconUrl,
} as const;

export type PageIconKey = keyof typeof pageIcons;

export function getPageIcon(page: string): string | undefined {
  return pageIcons[page as PageIconKey];
}
