# Changelog

## v0.7.4

### 修复

- 修复 `v0.7.3` 中本机配置读取失败的问题：MSIX / App Installer 检测代码被错误地放在了 PowerShell 输出对象内部，导致 `A null key is not allowed in a hash literal` 错误。

### 新增

- 已安装工具卡片的“管理”菜单中新增“路径”按钮，点击后通过资源管理器打开该工具的安装目录。
  - 便携工具优先打开其实际目录；
  - 安装版工具依次尝试：命令路径、开始菜单快捷方式目标、UWP/Store 应用安装位置。

## v0.7.3

### 改进

- 重写 `AGENTS.md` 为中文版本，移除错误的版本更新日志，新增 AI 输出语言规范。
- 改进 AI 修复体验：
  - 点击 AI 修复后按钮立即禁用并显示 spinner，避免重复点击；
  - 实时日志输出阶段信息（读取来源上下文、请求 AI 分析并校验安装源）；
  - 修复完成后无论成功或失败都在 `finally` 中恢复按钮状态；
  - 工具卡片基于持久化操作历史展示 AI 修复入口，不再因检测刷新覆盖 `failed` 状态而消失。
- 为 AI 修复 IPC 增加 90 秒超时与 `AbortController` 取消保护，避免 AI 接口卡死导致 UI 无响应。
- 在系统环境体检中新增 MSIX / App Installer 检测项：
  - App Installer（`Microsoft.DesktopAppInstaller`）
  - Microsoft UI.Xaml 框架依赖
  - 缺失时提供跳转 Microsoft Store 或通过 winget 修复的入口。
- AI 修复 prompt 现在能识别 MSIX / App Installer 类失败关键词，引导模型优先选择非 MSIX 安装形态（exe/msi、便携包等）。

### 测试与验证

- 新增 `electron/aiRepair.cjs` 与 `src/core/aiRepair.test.ts`。
- 更新 `src/core/environment.test.ts`，覆盖新的 App Installer 与 UI.Xaml 检查。
- `npm test` 155 个测试全部通过。
- `npm run build` 通过。
- `npm run package:win` 成功生成签名后的 Setup 与 Portable 包。
