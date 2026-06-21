import addToolTopbarUrl from "../../assets/topbars/add-tool-topbar.png";
import catalogTopbarUrl from "../../assets/topbars/catalog-topbar.png";
import discoverTopbarUrl from "../../assets/topbars/discover-topbar.png";
import logsTopbarUrl from "../../assets/topbars/logs-topbar.png";
import notesTopbarUrl from "../../assets/topbars/notes-topbar.png";
import settingsTopbarUrl from "../../assets/topbars/settings-topbar.png";
import systemTopbarUrl from "../../assets/topbars/system-topbar.png";
import updatesTopbarUrl from "../../assets/topbars/updates-topbar.png";

const pageTopbarImages = {
  catalog: catalogTopbarUrl,
  discover: discoverTopbarUrl,
  system: systemTopbarUrl,
  updates: updatesTopbarUrl,
  addTool: addToolTopbarUrl,
  notes: notesTopbarUrl,
  logs: logsTopbarUrl,
  settings: settingsTopbarUrl,
} as const;

export type PageTopbarKey = keyof typeof pageTopbarImages;

export function getPageTopbarImage(page: string) {
  return pageTopbarImages[page as PageTopbarKey] ?? catalogTopbarUrl;
}
