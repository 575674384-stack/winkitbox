# WinKitBox

WinKitBox 是一个 Windows 装机工具箱。换电脑后不用再一个个找下载页，导入自己的方案即可一键恢复常用软件环境。

## 当前功能（v0.2.x）

### 工具目录与装机

- **内置工具目录**：常见 Windows 开发、办公、系统、网络、媒体工具，优先使用 winget / 开源 / 官方源。
- **真实图标**：优先展示软件官网图标或 GitHub 项目头像。
- **装机方案**：支持按场景筛选（新电脑必装、开源优先、卸载清理、桌面整理等）。
- **安装计划**：根据勾选项生成 winget、直链下载、便携包解压、安装器执行等步骤的 PowerShell 脚本。
- **卸载清理**：已安装工具支持单个卸载和批量卸载。
- **安装后打开**：工具卡片内提供打开入口，桌面版会尝试从开始菜单、常见命令或管理目录启动。
- **自定义工具目录**：可设置 WinKitBox 管理的工具目录，便携工具、安装器缓存和解压依赖都会放在这里。
- **工具分类**：内置分类 + 用户自定义分类；支持为单个工具覆盖所属分类。

### AI 辅助

- **AI 添加工具**：输入 GitHub 仓库地址，调用 OpenAI 兼容接口自动读取仓库/Release 信息并生成工具条目。
- **AI 修复工具**：AI 生成的工具若无法正确安装，可一键让 AI 基于错误信息修复。
- **模型兼容**：兼容 GPT、Deepseek、腾讯混元、Xiaomi MIMOV2.5 等模型，支持模型列表、连通性测试。

### 本机配置

- **系统信息**：查看计算机名、系统版本、CPU、内存、硬盘、显卡、网卡等信息。
- **IP / DNS 配置**：读取并修改网卡 IP、网关、DNS；支持静态 IP、仅修改 DNS、恢复 DHCP。
- **公共 DNS 推荐**：内置阿里 DNS、DNSPod、114DNS、Cloudflare、Google DNS 推荐。
- **DNS 延迟检测**：测试各公共 DNS 对指定域名的解析延迟，支持预设域名和自定义域名。
- **UTF-8 Beta 开关**：一键开启/关闭 Windows 的“使用 Unicode UTF-8 提供全球语言支持”。

### GitHub 发现

- **GitHub 榜单**：内置 Windows 相关周榜 / 月榜阅览、语言筛选、中文自动翻译、候选收藏和 clone 命令复制。
- **代理支持**：桌面版支持系统代理、直连和手动代理，可填写 GitHub Token 提升 API 限额。

### 更新与同步

- **自动更新**：桌面版检查 GitHub 最新发行版，支持带进度条的本地下载，并提供安装版/便携版下载入口。
- **配置导入/导出**：导出/导入轻量级用户配置，同步已选工具、设置和 AI 添加的自定义工具。

### 桌面体验

- **系统托盘**：最小化/关闭默认收纳到托盘，可从托盘恢复或退出。
- **主题与玻璃效果**：内置多套主题，支持自定义背景、玻璃不透明度与模糊度调节。
- **操作日志**：预览脚本、模拟运行、查看 PowerShell 安装/卸载计划的实时输出。

## 本地运行

```powershell
npm install
npm run dev
```

## 验证

```powershell
npm test
npm run build
```

## 打包 Windows 版本

```powershell
npm run package:win
```

打包结果位于 `release/`：

- `WinKitBox-<version>-Setup-x64.exe` — 安装版
- `WinKitBox-<version>-Portable-x64.exe` — 便携版

## 项目结构

- `src/App.tsx` — 主界面、工具目录、本机配置、设置页
- `src/DiscoverView.tsx` — GitHub 榜单与发现页
- `src/core/` — 目录数据、安装计划、AI 工具、网络/DNS、GitHub、更新等核心逻辑
- `electron/` — Electron 主进程、IPC、托盘、PowerShell 执行
- `assets/icon/` — 应用图标

## 安全提示

- 不要将 GitHub Token、签名证书密码或个人凭据提交到仓库。
- 本地签名证书 `certs/` 已被 Git 忽略。
