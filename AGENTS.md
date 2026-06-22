# AGENTS.md

本文件是 AI 编码助手与未来维护者在 WinKitBox 项目上的工作指南。

## 项目简介

WinKitBox 是一款面向 Windows 的桌面装机/环境恢复工具箱，基于 **Electron + React + Vite** 构建。它帮助用户快速重建熟悉的 PC 环境，主要能力包括：

- 浏览和选择常用 Windows 工具；
- 生成并执行安装或卸载 PowerShell 计划；
- 检测已安装工具并从应用内启动；
- 在可配置的 WinKitBox 工具目录下管理便携工具；
- 展示本机系统/网络/DNS 信息，并通过提权 PowerShell 应用 IP 或 DNS 变更；
- 推荐公共 DNS 并测试预设或自定义域名的 DNS 延迟；
- 浏览 Windows 相关的 GitHub 周榜/月榜，支持代理与中文翻译；
- 通过 OpenAI 兼容的 AI 工作流添加自定义 GitHub 工具；
- 导出/导入轻量级用户配置，用于同步已选工具、设置和 AI 添加的工具；
- 打包 Windows 安装版与便携版。

本应用首先服务于个人 Windows 使用场景。改动应保持实用、本地化、保守。

## 技术栈

- 运行时：Electron
- 前端：React + TypeScript + Vite
- 测试：Vitest + jsdom
- 打包：electron-builder
- 图标：UI 内使用 lucide-react，应用图标位于 `assets/icon/`
- Shell 目标：Windows PowerShell

## 常用命令

在仓库根目录执行：

```powershell
npm install
npm run dev
npm run preview -- --port 4173
npm test
npm run build
npm run package:win
```

如果 `npm` 能找到但子进程找不到 `node`，可临时把 Node 加到 PATH：

```powershell
$env:Path='C:\Program Files\nodejs;'+$env:Path; npm test
```

## 项目结构

- `src/App.tsx`：主目录 UI、本机系统页、设置页、AI 添加工具流程、安装/打开/卸载动作。
- `src/components/`：从主应用壳中拆出的可复用渲染组件。
- `src/DiscoverView.tsx`：Windows 相关的 GitHub 周榜/月榜视图、代理模式、Token 输入、翻译流程。
- `src/styles.css`：全局应用样式。需保持在桌面窗口最小尺寸下的响应式。
- `src/styles/`：从全局样式表中拆出的组件级 CSS。
- `src/core/catalog.ts`：工具目录数据。优先使用官方、开源或稳定的直接下载源。
- `src/core/aiTool.ts`：校验 AI 生成的工具元数据并转换为目录条目。
- `src/core/config.ts`：轻量级导出/导入配置与自定义工具辅助函数。
- `src/core/network.ts`：公共 DNS 推荐、DNS 延迟排序辅助函数、DNS 测试域名预设。
- `src/core/planner.ts`：安装/卸载命令生成与 PowerShell 脚本渲染。
- `src/core/launcher.ts`：启动描述符与 logo URL 兜底逻辑。
- `src/core/toolStatus.ts`：运行时安装/打开/检测状态与进度快照。
- `src/core/runEvents.ts`：结构化 PowerShell 进度事件解析器。
- `src/core/github.ts`：GitHub 趋势请求辅助函数。
- `src/core/translation.ts`：翻译辅助函数。
- `src/core/update.ts`：版本对比与更新可用性辅助函数。
- `electron/main.cjs`：Electron 主进程、菜单/托盘/窗口行为、IPC、PowerShell 执行、设置、更新检查。
- `electron/themeIds.cjs`：设置与主题背景 IPC 共享的主进程主题 ID 规范化。
- `electron/preload.cjs`：安全的渲染进程桥接。新增渲染进程 API 时，也要同步到 `src/types/electron.d.ts`。
- `electron/windowsTools.cjs`：用于已安装工具检测与启动的生成 PowerShell。
- `electron/trayController.cjs`：托盘图标/菜单行为。
- `scripts/package-win.cjs`：Windows 打包包装脚本。
- `scripts/sign-win.cjs`：本地代码签名辅助脚本。

## 编码规范

- 保持安装、卸载、启动、检测行为一致。如果在 `planner.ts` 中修改了工具路径，也要检查 `launcher.ts` 和检测行为。
- 在修改 `src/core/` 中的共享逻辑前，先添加或更新相关测试。
- 不要把仅提供网页下载的工具变成浏览器跳转，除非没有稳定的直接安装途径。
- 保持 UI 紧凑、实用。这是一个工具箱，不是落地页。
- 优先使用应用已有的 lucide 图标。
- 避免在用户显式操作之外发起隐藏网络请求，轻量级更新检查除外。
- 保持 AI 调用由用户触发。模型列表、连接测试、工具生成只应在用户点击按钮后运行。
- 不要硬编码个人访问令牌、私有下载链接、本地绝对路径或机器相关密钥。
- 不要提交生成的安装包、本地证书、截图、日志、`node_modules` 或构建产物。

## 语言与输出规范

- AI 的思考过程、分析说明、结论、方案对比、操作反馈等面向用户的内容，**统一使用中文输出**。
- 以下情况可保留英文：文件路径、代码片段、变量名/函数名、技术标识符、必须保留的英文命令行参数、版本号、URL、以及已有的英文专有名词（如 winget、PowerShell、GitHub、npm）。
- 回复应简洁、准确、可操作，避免冗长铺垫。

## 工具目录规范

向 `src/core/catalog.ts` 添加工具时：

- 提供清晰的中文名称、摘要和描述；
- 包稳定时优先使用 `wingetId`；
- 便携工具需定义 `portable.downloadUrl`、`archiveName`、`targetDirName` 和 `executable`；
- 安装包工具需定义安装源和启动提示；
- 有用时包含 `repoUrl` 和 stars，尤其是 GitHub 开源工具；
- 在 `launch.startMenuNames`、`launch.commands` 或 `launch.appUserModelIds` 中添加启动提示；
- 如果新工具使用了新的安装形态，更新 planner 和 launcher 测试。

## AI 添加工具规范

设置页包含 AI 辅助的自定义工具流程。用户提供 OpenAI 兼容的 API URL、API Key、模型名和 GitHub 仓库主页。

实现要点：

- AI 设置保存在 Electron 用户数据设置文件中，不存入仓库。
- 渲染进程请求主进程列出模型、测试连接、生成工具。
- `electron/main.cjs` 拉取 GitHub 仓库/发布元数据，调用 `/v1/chat/completions`，返回结构化 JSON。
- `src/core/aiTool.ts` 是信任边界。它只接受直接安装形态：`winget`、GitHub 安装包资源、GitHub 便携资源。
- 不允许 AI 输出变成任意 PowerShell。如果需要新的安装形态，先添加类型化的目录形态和测试。

## 系统与网络规范

本机系统页通过 PowerShell 读取网卡/IP/DNS 信息，并通过提权应用 IP/DNS 变更。

- 网络变更必须显式且经用户确认。
- DNS 延迟测试保持用户触发，支持预设或用户提供的域名。
- 优先使用小型结构化 IPC 载荷，不要把原始脚本从渲染进程传给主进程。

## 验证清单

常规源码变更：

```powershell
npm test
npm run build
```

涉及 Windows 桌面行为的变更：

```powershell
npm run package:win
```

然后对 `release/` 中的便携版进行冒烟测试：

- 应用启动并显示预期版本；
- 顶部应用菜单隐藏；
- 托盘最小化/还原仍然可用；
- 安装/卸载计划仍能渲染；
- 自定义工具目录仍影响便携路径；
- 设置导出/导入保持在 1MB 以内；
- AI 添加工具流程显示模型检测、连接测试和 GitHub URL 生成控件；
- 本机系统页显示网卡和 DNS 推荐；
- GitHub 更新检查能读取最新公共发布。

## 发布清单

打包发布前：

1. 在 `package.json` 和 `package-lock.json` 中提升 `version` 到下一版本（例如 `0.3.5` → `0.3.6`）。
2. 在 `CHANGELOG.md` 中添加新的 `### vX.Y.Z` 章节。**不要把版本更新日志写进本文件。**
3. 运行 `npm test` 和 `npm run build`。
4. 运行 `npm run package:win` 生成签名的 Setup + Portable 可执行文件。
5. 提交版本改动，创建并推送匹配的标签：

   ```powershell
   git add -A
   git commit -m "release: vX.Y.Z"
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```

6. 在 GitHub 上创建一个**新的** Release，选择刚才推送的 `vX.Y.Z` 标签，填写发布说明，并上传 `release/` 目录下的 Setup 和 Portable `.exe` 文件；不要覆盖已有发布标签。

典型产物名称：

- `WinKitBox-<version>-Setup-x64.exe`
- `WinKitBox-<version>-Portable-x64.exe`

应用内置的更新检查读取：

```text
https://api.github.com/repos/575674384-stack/winkitbox/releases/latest
```

因此公开的 GitHub Release 标签应与包版本一致，例如 `v0.1.9`。

## 安全规范

- 永远不要提交 GitHub 令牌、私有证书、PFX 密码或生成的签名密钥。
- `certs/` 下的本地签名证书被有意忽略。
- 如果令牌出现在聊天、终端历史或日志中，视为已泄露并立即轮换。
- Git 远程地址不得包含内嵌凭据。请使用临时鉴权头或凭据管理器。
