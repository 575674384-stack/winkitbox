export type ToolCategory =
  | "starter"
  | "system"
  | "files"
  | "capture"
  | "cleanup"
  | "desktop"
  | "network"
  | "rescue"
  | "ai"
  | "ime";

export type ToolSource = "winget" | "scoop" | "github" | "store" | "website" | "builtin" | "custom";

export type RiskLevel = "low" | "medium" | "high";

export type Tool = {
  id: string;
  name: string;
  category: ToolCategory;
  summary: string;
  description: string;
  source: ToolSource;
  license: string;
  stars?: number;
  homepage: string;
  repoUrl?: string;
  wingetId?: string;
  scoopPackage?: string;
  logoUrl?: string;
  portable?: {
    downloadUrl?: string;
    releaseApiUrl?: string;
    assetPattern?: string;
    targetDirName: string;
    archive?: "zip" | "7z";
    executable: string;
    fileName?: string;
    sevenZipDownloadUrl?: string;
  };
  installer?: {
    downloadUrl?: string;
    releaseApiUrl?: string;
    assetPattern?: string;
    targetDirName: string;
    fileName: string;
    args?: string[];
  };
  customInstallCommand?: string;
  customUninstallCommand?: string;
  launch?: {
    appUserModelIds?: string[];
    startMenuNames?: string[];
    commands?: string[];
  };
  tags: string[];
  defaultSelected?: boolean;
  requiresAdmin?: boolean;
  risk: RiskLevel;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  toolIds: string[];
};

export const categoryLabels: Record<ToolCategory, string> = {
  starter: "一键装机",
  system: "系统增强",
  files: "文件体验",
  capture: "截图剪贴",
  cleanup: "卸载清理",
  desktop: "桌面整理",
  network: "网络同步",
  rescue: "维护急救",
  ai: "AI 应用",
  ime: "输入法"
};

const baseTools: Tool[] = [
  {
    id: "powertoys",
    name: "PowerToys",
    category: "starter",
    summary: "微软官方 Windows 增强工具集",
    description: "窗口布局、批量重命名、取色、快捷启动、图片尺寸调整等常用增强能力。",
    source: "winget",
    license: "MIT",
    stars: 134000,
    homepage: "https://learn.microsoft.com/windows/powertoys/",
    repoUrl: "https://github.com/microsoft/PowerToys",
    wingetId: "Microsoft.PowerToys",
    logoUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/2020%20PowerToys%20Icon.svg",
    launch: {
      startMenuNames: ["PowerToys"],
      commands: ["PowerToys.exe"]
    },
    tags: ["效率", "微软", "窗口管理"],
    defaultSelected: true,
    requiresAdmin: true,
    risk: "low"
  },
  {
    id: "terminal",
    name: "Windows Terminal",
    category: "starter",
    summary: "现代命令行终端",
    description: "微软官方终端，适合搭配 PowerShell 7、WSL、Git 等开发/维护工作流。",
    source: "winget",
    license: "MIT",
    stars: 99000,
    homepage: "https://github.com/microsoft/terminal",
    repoUrl: "https://github.com/microsoft/terminal",
    wingetId: "Microsoft.WindowsTerminal",
    logoUrl: "https://raw.githubusercontent.com/microsoft/terminal/main/res/terminal.ico",
    launch: {
      startMenuNames: ["Windows Terminal", "终端"],
      commands: ["wt.exe"]
    },
    tags: ["终端", "微软", "开发"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "powershell",
    name: "PowerShell 7",
    category: "system",
    summary: "新版跨平台 PowerShell",
    description: "比系统自带 Windows PowerShell 更新，适合自动化脚本和装机维护。",
    source: "winget",
    license: "MIT",
    stars: 49000,
    homepage: "https://github.com/PowerShell/PowerShell",
    repoUrl: "https://github.com/PowerShell/PowerShell",
    wingetId: "Microsoft.PowerShell",
    logoUrl: "https://raw.githubusercontent.com/PowerShell/PowerShell/master/assets/Powershell_av_colors.ico",
    launch: {
      startMenuNames: ["PowerShell 7"],
      commands: ["pwsh.exe"]
    },
    tags: ["终端", "自动化", "脚本"],
    defaultSelected: true,
    requiresAdmin: true,
    risk: "low"
  },
  {
    id: "unigetui",
    name: "UniGetUI",
    category: "starter",
    summary: "图形化管理 winget / scoop / choco",
    description: "适合集中查看、安装和更新 Windows 软件包。",
    source: "winget",
    license: "MIT",
    stars: 18000,
    homepage: "https://github.com/Devolutions/UniGetUI",
    repoUrl: "https://github.com/Devolutions/UniGetUI",
    wingetId: "Devolutions.UniGetUI",
    launch: {
      startMenuNames: ["UniGetUI"],
      commands: ["UniGetUI.exe"]
    },
    tags: ["软件管理", "winget", "更新"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "localsend",
    name: "LocalSend",
    category: "network",
    summary: "局域网跨设备传文件",
    description: "不走云端的局域网文件传输工具，手机和电脑之间很好用。",
    source: "winget",
    license: "MIT",
    stars: 65000,
    homepage: "https://localsend.org/",
    repoUrl: "https://github.com/localsend/localsend",
    wingetId: "LocalSend.LocalSend",
    launch: {
      startMenuNames: ["LocalSend"],
      commands: ["LocalSend.exe", "localsend.exe"]
    },
    tags: ["传输", "局域网", "跨平台"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "sharex",
    name: "ShareX",
    category: "capture",
    summary: "截图、录屏、OCR、上传",
    description: "开源截图录屏工具，功能完整，适合重度截图和标注工作流。",
    source: "winget",
    license: "GPL-3.0",
    stars: 38000,
    homepage: "https://getsharex.com/",
    repoUrl: "https://github.com/ShareX/ShareX",
    wingetId: "ShareX.ShareX",
    launch: {
      startMenuNames: ["ShareX"],
      commands: ["ShareX.exe"]
    },
    tags: ["截图", "录屏", "OCR"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "flow-launcher",
    name: "Flow Launcher",
    category: "starter",
    summary: "快速启动器和搜索入口",
    description: "类似 Spotlight/Alfred 的 Windows 启动器，支持插件。",
    source: "winget",
    license: "MIT",
    stars: 14900,
    homepage: "https://www.flowlauncher.com/",
    repoUrl: "https://github.com/Flow-Launcher/Flow.Launcher",
    wingetId: "Flow-Launcher.Flow-Launcher",
    launch: {
      startMenuNames: ["Flow Launcher"],
      commands: ["Flow.Launcher.exe"]
    },
    tags: ["启动器", "搜索", "效率"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "files",
    name: "Files",
    category: "files",
    summary: "现代 Windows 文件管理器",
    description: "标签页、文件标签、现代 UI 和更舒服的文件管理体验。",
    source: "winget",
    license: "MIT",
    stars: 44000,
    homepage: "https://files.community/",
    repoUrl: "https://github.com/files-community/Files",
    wingetId: "FilesCommunity.Files",
    launch: {
      appUserModelIds: ["Files_1y0xx7n9077q4!App"],
      startMenuNames: ["Files"]
    },
    tags: ["文件管理", "标签页", "现代 UI"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "quicklook",
    name: "QuickLook",
    category: "files",
    summary: "空格快速预览文件",
    description: "把 macOS 的空格预览体验带到 Windows。",
    source: "winget",
    license: "GPL-3.0",
    stars: 19000,
    homepage: "https://github.com/QL-Win/QuickLook",
    repoUrl: "https://github.com/QL-Win/QuickLook",
    wingetId: "QL-Win.QuickLook",
    launch: {
      startMenuNames: ["QuickLook"],
      commands: ["QuickLook.exe"]
    },
    tags: ["预览", "文件", "效率"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "nanazip",
    name: "NanaZip",
    category: "files",
    summary: "现代 Windows 压缩工具",
    description: "基于 7-Zip 的开源压缩工具，适配 Windows 11 右键菜单。",
    source: "winget",
    license: "LGPL-3.0",
    stars: 12000,
    homepage: "https://github.com/M2Team/NanaZip",
    repoUrl: "https://github.com/M2Team/NanaZip",
    wingetId: "M2Team.NanaZip",
    launch: {
      startMenuNames: ["NanaZip"],
      commands: ["NanaZip.exe"]
    },
    tags: ["压缩", "7-Zip", "开源"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "bandizip",
    name: "Bandizip",
    category: "files",
    summary: "常用压缩软件",
    description: "免费版可用的压缩工具，适合习惯 Bandizip 操作和右键菜单的人。",
    source: "winget",
    license: "Freeware",
    homepage: "https://www.bandisoft.com/bandizip/",
    wingetId: "Bandisoft.Bandizip",
    launch: {
      startMenuNames: ["Bandizip"],
      commands: ["Bandizip.exe"]
    },
    tags: ["压缩", "免费", "右键菜单"],
    risk: "medium"
  },
  {
    id: "sumatrapdf",
    name: "SumatraPDF",
    category: "files",
    summary: "轻量 PDF/电子书阅读器",
    description: "启动快、体积小，支持 PDF、EPUB、MOBI、CBZ、CBR 等格式。",
    source: "winget",
    license: "GPL-3.0",
    stars: 15000,
    homepage: "https://www.sumatrapdfreader.org/",
    repoUrl: "https://github.com/sumatrapdfreader/sumatrapdf",
    wingetId: "SumatraPDF.SumatraPDF",
    launch: {
      startMenuNames: ["SumatraPDF"],
      commands: ["SumatraPDF.exe"]
    },
    tags: ["PDF", "阅读", "轻量"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "notepad-plus-plus",
    name: "Notepad++",
    category: "files",
    summary: "经典文本编辑器",
    description: "轻量文本和代码编辑器，适合临时改配置、日志和脚本。",
    source: "winget",
    license: "GPL-3.0",
    stars: 28000,
    homepage: "https://notepad-plus-plus.org/",
    repoUrl: "https://github.com/notepad-plus-plus/notepad-plus-plus",
    wingetId: "Notepad++.Notepad++",
    launch: {
      startMenuNames: ["Notepad++"],
      commands: ["notepad++.exe"]
    },
    tags: ["编辑器", "文本", "配置"],
    defaultSelected: true,
    risk: "low"
  },
  {
    id: "geek",
    name: "Geek Uninstaller",
    category: "cleanup",
    summary: "轻量卸载和残留清理",
    description: "便携小工具，适合快速卸载软件和清理常见残留。",
    source: "website",
    license: "Freeware",
    homepage: "https://geekuninstaller.com/download",
    portable: {
      downloadUrl: "https://geekuninstaller.com/geek.zip",
      targetDirName: "geek",
      archive: "zip",
      executable: "geek.exe"
    },
    launch: {
      startMenuNames: ["Geek Uninstaller", "Geek"],
      commands: ["geek.exe"]
    },
    tags: ["卸载", "便携", "清理"],
    defaultSelected: true,
    risk: "medium"
  },
  {
    id: "bcuninstaller",
    name: "Bulk Crap Uninstaller",
    category: "cleanup",
    summary: "开源批量卸载器",
    description: "适合批量卸载、检测残留和处理预装软件。",
    source: "winget",
    license: "Apache-2.0",
    stars: 14000,
    homepage: "https://www.bcuninstaller.com/",
    repoUrl: "https://github.com/Klocman/Bulk-Crap-Uninstaller",
    wingetId: "Klocman.BulkCrapUninstaller",
    launch: {
      startMenuNames: ["Bulk Crap Uninstaller", "BCUninstaller"],
      commands: ["BCUninstaller.exe"]
    },
    tags: ["卸载", "批量", "残留"],
    defaultSelected: true,
    risk: "medium"
  },
  {
    id: "czkawka",
    name: "Czkawka",
    category: "cleanup",
    summary: "重复文件和大文件清理",
    description: "查找重复文件、相似图片、空文件夹、大文件和临时文件。",
    source: "winget",
    license: "MIT",
    stars: 25000,
    homepage: "https://github.com/qarmin/czkawka",
    repoUrl: "https://github.com/qarmin/czkawka",
    wingetId: "qarmin.czkawka",
    launch: {
      startMenuNames: ["Czkawka"],
      commands: ["czkawka_gui.exe", "czkawka.exe"]
    },
    tags: ["重复文件", "图片", "磁盘"],
    risk: "medium"
  },
  {
    id: "bleachbit",
    name: "BleachBit",
    category: "cleanup",
    summary: "开源系统清理工具",
    description: "清理缓存、临时文件和隐私痕迹。建议先预览再清理。",
    source: "winget",
    license: "GPL-3.0",
    stars: 4200,
    homepage: "https://www.bleachbit.org/",
    repoUrl: "https://github.com/bleachbit/bleachbit",
    wingetId: "BleachBit.BleachBit",
    launch: {
      startMenuNames: ["BleachBit"],
      commands: ["bleachbit.exe"]
    },
    tags: ["清理", "缓存", "隐私"],
    risk: "high"
  },
  {
    id: "portals",
    name: "Portals",
    category: "desktop",
    summary: "桌面文件夹收纳区域",
    description: "在桌面创建文件夹内容门户，用区域方式整理桌面。官方安装包直链，Inno Setup 静默安装。",
    source: "github",
    license: "Freeware",
    stars: 1200,
    homepage: "https://portals-app.com/",
    repoUrl: "https://github.com/Ross-Patterson/Portals-Desktop-Organization",
    installer: {
      downloadUrl: "https://downloads.portals-app.com/installers%2F3.4.0.0%2Fportals_installer_v3-4-0-0.exe?alt=media",
      targetDirName: "portals",
      fileName: "PortalsSetup.exe",
      args: ["/SILENT"]
    },
    launch: {
      startMenuNames: ["Portals"],
      commands: ["Portals.exe"]
    },
    tags: ["桌面整理", "收纳", "文件夹"],
    defaultSelected: true,
    requiresAdmin: true,
    risk: "low"
  },
  {
    id: "nofences",
    name: "NoFences",
    category: "desktop",
    summary: "开源 Fences 替代",
    description: "用透明容器整理桌面图标，适合作为免费开源桌面整理方案。",
    source: "github",
    license: "MIT",
    stars: 647,
    homepage: "https://github.com/Twometer/NoFences",
    repoUrl: "https://github.com/Twometer/NoFences",
    portable: {
      releaseApiUrl: "https://api.github.com/repos/Twometer/NoFences/releases/latest",
      assetPattern: "^NoFences\\.exe$",
      targetDirName: "nofences",
      executable: "NoFences.exe"
    },
    launch: {
      startMenuNames: ["NoFences"],
      commands: ["NoFences.exe"]
    },
    tags: ["桌面整理", "开源", "容器"],
    risk: "medium"
  },
  {
    id: "fenceless",
    name: "Fenceless",
    category: "desktop",
    summary: "轻量桌面图标容器",
    description: "便携式桌面图标收纳工具，带透明度、隐藏和热键能力。",
    source: "github",
    license: "MIT",
    homepage: "https://github.com/Damianttje/Fenceless",
    repoUrl: "https://github.com/Damianttje/Fenceless",
    portable: {
      releaseApiUrl: "https://codeberg.org/api/v1/repos/Wavestorm/Fenceless/releases",
      assetPattern: "Fenceless-.*-win-x64\\.7z$",
      targetDirName: "fenceless",
      archive: "7z",
      executable: "win-x64\\Fenceless.exe",
      sevenZipDownloadUrl: "https://www.7-zip.org/a/7zr.exe"
    },
    launch: {
      startMenuNames: ["Fenceless"],
      commands: ["Fenceless.exe"]
    },
    tags: ["桌面整理", "便携", "容器"],
    risk: "medium"
  },
  {
    id: "coodesker",
    name: "酷呆桌面",
    category: "desktop",
    summary: "中文桌面整理盒子",
    description: "免费闭源桌面整理软件，适合国内用户的盒子式桌面分类。",
    source: "github",
    license: "Freeware",
    homepage: "https://github.com/coodesker/coodesker-desktop",
    repoUrl: "https://github.com/coodesker/coodesker-desktop",
    installer: {
      releaseApiUrl: "https://api.github.com/repos/coodesker/coodesker-desktop/releases/latest",
      assetPattern: "^Coodesker-x64_.*\\.exe$",
      targetDirName: "coodesker",
      fileName: "CoodeskerSetup.exe"
    },
    launch: {
      startMenuNames: ["Coodesker", "酷呆桌面"],
      commands: ["Coodesker.exe"]
    },
    tags: ["桌面整理", "中文", "免费"],
    risk: "medium"
  },
  {
    id: "syncthing",
    name: "Syncthing",
    category: "network",
    summary: "开源点对点文件同步",
    description: "多设备实时文件同步，不依赖中心云服务。",
    source: "winget",
    license: "MPL-2.0",
    stars: 72000,
    homepage: "https://syncthing.net/",
    repoUrl: "https://github.com/syncthing/syncthing",
    wingetId: "Syncthing.Syncthing",
    launch: {
      startMenuNames: ["Syncthing"],
      commands: ["syncthing.exe"]
    },
    tags: ["同步", "P2P", "跨平台"],
    risk: "low"
  },
  {
    id: "rustdesk",
    name: "RustDesk",
    category: "network",
    summary: "开源远程桌面",
    description: "可开箱即用，也可自建中继服务器的远程控制工具。",
    source: "winget",
    license: "AGPL-3.0",
    stars: 97000,
    homepage: "https://rustdesk.com/",
    repoUrl: "https://github.com/rustdesk/rustdesk",
    wingetId: "RustDesk.RustDesk",
    launch: {
      startMenuNames: ["RustDesk"],
      commands: ["rustdesk.exe"]
    },
    tags: ["远程桌面", "自建", "开源"],
    risk: "medium"
  },
  {
    id: "qbittorrent",
    name: "qBittorrent",
    category: "network",
    summary: "开源 BT 下载器",
    description: "稳定、无广告、跨平台的 BitTorrent 客户端。",
    source: "winget",
    license: "GPL-2.0",
    stars: 32000,
    homepage: "https://www.qbittorrent.org/",
    repoUrl: "https://github.com/qbittorrent/qBittorrent",
    wingetId: "qBittorrent.qBittorrent",
    launch: {
      startMenuNames: ["qBittorrent"],
      commands: ["qbittorrent.exe"]
    },
    tags: ["下载", "BT", "开源"],
    risk: "low"
  },
  {
    id: "free-download-manager",
    name: "Free Download Manager",
    category: "network",
    summary: "多线程下载管理器",
    description: "常用免费下载管理器，适合大文件下载、断点续传和下载队列。",
    source: "winget",
    license: "Freeware",
    homepage: "https://www.freedownloadmanager.org/",
    wingetId: "SoftDeluxe.FreeDownloadManager",
    launch: {
      startMenuNames: ["Free Download Manager"],
      commands: ["fdm.exe"]
    },
    tags: ["下载", "断点续传", "免费"],
    defaultSelected: true,
    risk: "medium"
  },
  {
    id: "rufus",
    name: "Rufus",
    category: "rescue",
    summary: "启动 U 盘制作",
    description: "轻量可靠的启动盘制作工具，适合系统安装和维护。",
    source: "winget",
    license: "GPL-3.0",
    stars: 33000,
    homepage: "https://rufus.ie/",
    repoUrl: "https://github.com/pbatard/rufus",
    wingetId: "Rufus.Rufus",
    launch: {
      startMenuNames: ["Rufus"],
      commands: ["rufus.exe"]
    },
    tags: ["U盘", "启动盘", "维护"],
    risk: "medium"
  },
  {
    id: "ventoy",
    name: "Ventoy",
    category: "rescue",
    summary: "多 ISO 启动盘",
    description: "一次制作 U 盘，之后直接复制 ISO/WIM/IMG 文件即可启动。",
    source: "winget",
    license: "GPL-3.0",
    stars: 67000,
    homepage: "https://www.ventoy.net/",
    repoUrl: "https://github.com/ventoy/Ventoy",
    wingetId: "Ventoy.Ventoy",
    launch: {
      startMenuNames: ["Ventoy", "Ventoy2Disk"],
      commands: ["Ventoy2Disk.exe", "Ventoy.exe"]
    },
    tags: ["U盘", "ISO", "维护"],
    risk: "medium"
  },
  {
    id: "libre-hardware-monitor",
    name: "LibreHardwareMonitor",
    category: "rescue",
    summary: "硬件温度和负载监控",
    description: "查看 CPU/GPU 温度、风扇、电压、负载和频率。",
    source: "winget",
    license: "MPL-2.0",
    stars: 8500,
    homepage: "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor",
    repoUrl: "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor",
    wingetId: "LibreHardwareMonitor.LibreHardwareMonitor",
    launch: {
      startMenuNames: ["Libre Hardware Monitor", "LibreHardwareMonitor"],
      commands: ["LibreHardwareMonitor.exe"]
    },
    tags: ["硬件", "温度", "监控"],
    risk: "low"
  },
  {
    id: "everything-toolbar",
    name: "EverythingToolbar",
    category: "files",
    summary: "任务栏极速文件搜索",
    description: "把 Everything 搜索整合到 Windows 任务栏。",
    source: "winget",
    license: "MIT",
    stars: 12000,
    homepage: "https://github.com/srwi/EverythingToolbar",
    repoUrl: "https://github.com/srwi/EverythingToolbar",
    wingetId: "srwi.EverythingToolbar",
    launch: {
      startMenuNames: ["EverythingToolbar", "Everything Toolbar"],
      commands: ["EverythingToolbar.Launcher.exe"]
    },
    tags: ["搜索", "任务栏", "文件"],
    risk: "low"
  },
  {
    id: "ditto",
    name: "Ditto",
    category: "capture",
    summary: "经典剪贴板管理器",
    description: "保存剪贴板历史，方便重复粘贴文本、图片和常用片段。",
    source: "winget",
    license: "GPL-3.0",
    stars: 2500,
    homepage: "https://ditto-cp.sourceforge.io/",
    repoUrl: "https://github.com/sabrogden/Ditto",
    wingetId: "Ditto.Ditto",
    launch: {
      startMenuNames: ["Ditto"],
      commands: ["Ditto.exe"]
    },
    tags: ["剪贴板", "历史", "效率"],
    risk: "low"
  }
];

const removedToolIds = new Set(["quicklook", "notepad-plus-plus", "sharex", "nofences"]);

const additionalTools: Tool[] = [
  {
    id: "openai-codex",
    name: "Codex",
    category: "ai",
    summary: "OpenAI 官方编码代理 CLI",
    description: "运行在终端里的本地编码代理，适合在项目目录里读代码、改代码和跑测试。",
    source: "github",
    license: "Apache-2.0",
    stars: 47200,
    homepage: "https://github.com/openai/codex",
    repoUrl: "https://github.com/openai/codex",
    customInstallCommand:
      "& { $ErrorActionPreference = 'Stop'; powershell -ExecutionPolicy ByPass -c \"irm https://chatgpt.com/codex/install.ps1 | iex\"; $global:LASTEXITCODE = $LASTEXITCODE }",
    customUninstallCommand:
      "& { if (Get-Command npm -ErrorAction SilentlyContinue) { npm uninstall -g @openai/codex }; $global:LASTEXITCODE = 0 }",
    launch: {
      startMenuNames: ["Codex"],
      commands: ["codex.exe", "codex"]
    },
    tags: ["AI", "开发", "CLI"],
    risk: "medium"
  },
  {
    id: "cc-switch",
    name: "CC Switch",
    category: "ai",
    summary: "AI CLI 配置和服务商切换工具",
    description: "统一管理 Claude Code、Codex、Gemini CLI 等工具的配置、代理和提供商。",
    source: "github",
    license: "GPL-3.0",
    stars: 2000,
    homepage: "https://github.com/farion1231/cc-switch",
    repoUrl: "https://github.com/farion1231/cc-switch",
    installer: {
      releaseApiUrl: "https://api.github.com/repos/farion1231/cc-switch/releases/latest",
      assetPattern: "^CC-Switch-v.*-Windows\\.msi$",
      targetDirName: "cc-switch",
      fileName: "CC-Switch-Windows.msi"
    },
    launch: {
      startMenuNames: ["CC Switch", "CC-Switch"],
      commands: ["CC-Switch.exe"]
    },
    tags: ["AI", "Claude", "Codex", "配置"],
    risk: "medium"
  },
  {
    id: "codex-plus-plus",
    name: "Codex++",
    category: "ai",
    summary: "Codex 增强工具",
    description: "给 Codex 桌面体验增加管理、增强、修复和用户脚本能力。",
    source: "github",
    license: "Unknown",
    stars: 1500,
    homepage: "https://github.com/BigPizzaV3/CodexPlusPlus",
    repoUrl: "https://github.com/BigPizzaV3/CodexPlusPlus",
    installer: {
      releaseApiUrl: "https://api.github.com/repos/BigPizzaV3/CodexPlusPlus/releases/latest",
      assetPattern: "^CodexPlusPlus-.*-windows-x64-setup\\.exe$",
      targetDirName: "codex-plus-plus",
      fileName: "CodexPlusPlusSetup.exe"
    },
    launch: {
      startMenuNames: ["Codex++", "Codex++ 管理工具"],
      commands: ["CodexPlusPlus.exe", "Codex++.exe"]
    },
    tags: ["AI", "Codex", "增强"],
    risk: "medium"
  },
  {
    id: "p-ai",
    name: "P-ai",
    category: "ai",
    summary: "AI 工具桌面端",
    description: "开源 AI 桌面应用，提供本地化的 AI 工作流入口。",
    source: "github",
    license: "Unknown",
    stars: 700,
    homepage: "https://github.com/kawayiYokami/P-ai",
    repoUrl: "https://github.com/kawayiYokami/P-ai",
    installer: {
      releaseApiUrl: "https://api.github.com/repos/kawayiYokami/P-ai/releases/latest",
      assetPattern: "^P-ai_.*_x64-setup\\.exe$",
      targetDirName: "p-ai",
      fileName: "P-aiSetup.exe"
    },
    launch: {
      startMenuNames: ["P-ai", "P AI"],
      commands: ["P-ai.exe"]
    },
    tags: ["AI", "桌面端", "开源"],
    risk: "medium"
  },
  {
    id: "wechat-input",
    name: "微信输入法",
    category: "ime",
    summary: "微信官方中文输入法",
    description: "腾讯微信团队出品的中文输入法，适合需要微信词库和跨端体验的人。",
    source: "winget",
    license: "Freeware",
    homepage: "https://z.weixin.qq.com/",
    wingetId: "Tencent.WeType",
    launch: {
      startMenuNames: ["微信输入法", "WeType"],
      commands: ["WeType.exe"]
    },
    tags: ["输入法", "中文", "微信"],
    risk: "medium"
  },
  {
    id: "rime-weasel",
    name: "小狼毫 Weasel",
    category: "ime",
    summary: "Rime 官方 Windows 输入法",
    description: "基于 Rime 引擎的开源中文输入法，支持拼音、双拼、五笔、仓颉等方案。",
    source: "winget",
    license: "GPL-3.0",
    stars: 7200,
    homepage: "https://rime.im/",
    repoUrl: "https://github.com/rime/weasel",
    wingetId: "Rime.Weasel",
    launch: {
      startMenuNames: ["小狼毫", "Weasel", "Rime"],
      commands: ["WeaselDeployer.exe", "WeaselServer.exe"]
    },
    tags: ["输入法", "Rime", "开源"],
    risk: "low"
  },
  {
    id: "pime",
    name: "PIME",
    category: "ime",
    summary: "Windows TSF 输入法框架",
    description: "开源 Windows 输入法框架，适合体验或开发基于 Python/Node 的输入法。",
    source: "github",
    license: "LGPL-2.1",
    stars: 1700,
    homepage: "https://github.com/EasyIME/PIME",
    repoUrl: "https://github.com/EasyIME/PIME",
    installer: {
      releaseApiUrl: "https://api.github.com/repos/EasyIME/PIME/releases/latest",
      assetPattern: "^PIME-.*-setup\\.exe$",
      targetDirName: "pime",
      fileName: "PIMESetup.exe"
    },
    launch: {
      startMenuNames: ["PIME"],
      commands: ["PIME.exe"]
    },
    tags: ["输入法", "TSF", "开源"],
    risk: "medium"
  },
  {
    id: "windows-chewing",
    name: "Windows Chewing",
    category: "ime",
    summary: "新酷音 Windows 注音输入法",
    description: "基于 Text Services Framework 的开源注音输入法，适合繁体中文注音用户。",
    source: "github",
    license: "GPL-3.0",
    stars: 242,
    homepage: "https://github.com/chewing/windows-chewing-tsf",
    repoUrl: "https://github.com/chewing/windows-chewing-tsf",
    installer: {
      releaseApiUrl: "https://api.github.com/repos/chewing/windows-chewing-tsf/releases/latest",
      assetPattern: "^windows-chewing-tsf-.*-installer\\.msi$",
      targetDirName: "windows-chewing",
      fileName: "WindowsChewing.msi"
    },
    launch: {
      startMenuNames: ["Chewing", "新酷音"],
      commands: []
    },
    tags: ["输入法", "注音", "开源"],
    risk: "medium"
  },
  {
    id: "wise-registry-cleaner",
    name: "Wise Registry Cleaner",
    category: "cleanup",
    summary: "注册表清理和优化",
    description: "用于扫描和清理无效注册表项。建议先创建还原点，再执行清理。",
    source: "winget",
    license: "Freeware",
    homepage: "https://www.wisecleaner.com/wise-registry-cleaner.html",
    wingetId: "WiseCleaner.WiseRegistryCleaner",
    launch: {
      startMenuNames: ["Wise Registry Cleaner"],
      commands: ["WiseRegCleaner.exe"]
    },
    tags: ["注册表", "清理", "优化"],
    risk: "high"
  },
  {
    id: "zyperwin",
    name: "ZyperWin++",
    category: "system",
    summary: "开源 Windows 优化工具",
    description: "面向 Windows 7-11 的系统优化、服务优化、垃圾清理和维护工具。",
    source: "github",
    license: "GPL-3.0",
    stars: 7900,
    homepage: "https://github.com/ZyperWave/ZyperWinOptimize",
    repoUrl: "https://github.com/ZyperWave/ZyperWinOptimize",
    portable: {
      releaseApiUrl: "https://api.github.com/repos/ZyperWave/ZyperWinOptimize/releases/latest",
      assetPattern: "^ZyperWin\\+\\+.*\\.zip$",
      targetDirName: "zyperwin",
      archive: "zip",
      executable: "Release\\ZyperWin++.exe"
    },
    launch: {
      startMenuNames: ["ZyperWin++", "ZyperWin"],
      commands: ["ZyperWin++.exe"]
    },
    tags: ["系统优化", "清理", "开源"],
    requiresAdmin: true,
    risk: "high"
  }
];

export const tools: Tool[] = [
  ...baseTools.filter((tool) => !removedToolIds.has(tool.id)),
  ...additionalTools
];

export const presets: Preset[] = [];
