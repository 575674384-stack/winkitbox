# 目标

改进 WinKitBox 中两条相互关联的故障恢复路径：

1. **AI 修复体验**：让 AI 修复流程可见、可响应、反馈充分，解决用户遇到的“安装失败后没有 AI 修复按钮、进入日志才出现、点击后长时间无反馈、随后突然提示失败”等问题。
2. **MSIX / App Installer 环境健康**：在系统环境体检中增加对 Windows MSIX 部署栈（App Installer、UI.Xaml 框架依赖）的检测与修复指引，降低 Windows Terminal 等 Store 签名包的安装失败率；同时在 AI 修复 prompt 中识别 MSIX 类失败，引导模型优先选择非 MSIX 安装形态。

# 架构

前端继续使用 React + CSS，不引入新依赖。所有改动均为增量：

- 在 `src/core/environment.ts` 中扩展 `EnvironmentSnapshot` / `EnvironmentCheckId`，新增 MSIX 相关检查项。
- 在 `src/App.tsx` 中新增 AI 修复进度状态，使按钮可禁用、可展示 spinner，并在实时日志中输出阶段信息。
- 保持现有 `ai-fix-tool` IPC 契约不变，仅在渲染层反馈和主进程超时保护上做增强。
- AI 修复入口从持久化的操作历史（activity log）派生，而不是依赖会被检测刷新覆盖的瞬时 `toolState.status === "failed"`。
- 在 AI 修复 prompt 中，当错误信息包含 MSIX/App Installer 关键词时注入额外指令，让模型优先避开 MSIX-only 源。

# 技术栈

- 渲染层状态/UI：`src/App.tsx`、`src/LogsView.tsx`
- 工具状态模型：`src/core/toolStatus.ts`
- 环境模型：`src/core/environment.ts`
- 主进程/IPC/AI prompt：`electron/main.cjs`
- 渲染层桥接类型：`src/types/electron.d.ts`
- 测试：Vitest，覆盖 `environment.test.ts`、`toolStatus.test.ts` 以及 App/LogsView 的 AI 修复行为测试
- 样式：`src/styles.css`、`src/styles/components.css`（如需新增 spinner/阶段提示类）

# 基线/权威引用

- `docs/aegis/baseline/baseline.md` — 安装形态、AI 边界、系统/网络操作的持久契约。
- `AGENTS.md` — 验证命令与项目规范。
- `src/core/environment.ts` 中的现有环境检查。
- `electron/main.cjs` 与 `src/App.tsx` 中的现有 AI 修复流程。

# 兼容性边界

- 不改变现有 `settings.json` 中已有 key 的 schema。
- 不改变 `Tool` 安装形态契约；MSIX 兜底通过环境检测和 AI repair prompt 实现，不新增 install type。
- 保持 `ai-fix-tool` IPC 的入参和返回形状向后兼容。
- 保留现有已选工具、自定义工具、记事本和日志数据。
- 环境体检面板在缺少新 MSIX 注册表值的 Windows 版本上仍需正常工作（fail-open）。

# 验证

- `npm test` 通过。
- `npm run build` 通过。
- `npm run package:win` 成功（涉及 Electron/PowerShell 改动）。
- 冒烟测试场景：
  - 安装工具并触发失败，确认工具卡片和日志中心都出现 AI 修复按钮；
  - 点击 AI 修复，确认按钮禁用并出现 spinner，实时日志展示阶段信息；
  - 确认 AI 修复超时/取消后 UI 不会卡住；
  - 打开系统页环境体检，确认新增 App Installer / UI.Xaml 检查项，缺失时显示修复入口；
  - 在健康机器上确认 Windows Terminal 仍能正常安装。

# 任务

1. **AI 修复渲染层状态与反馈**
   - 在 `src/App.tsx` 新增 `aiRepairingToolId?: string` 状态。
   - 修改 `fixToolWithAi`，在 IPC 调用前设置 `aiRepairingToolId`，在 `finally` 中清空。
   - 增加阶段实时日志：`AI 修复 {name}：正在读取来源上下文...`、`AI 修复 {name}：正在请求 AI 分析并校验安装源...`。
   - 点击后禁用 AI 修复按钮并显示 spinner，匹配 `aiRepairingToolId` 时展示“修复中”。

2. **基于操作历史的持久化 AI 修复入口**
   - 复用 `getLatestToolFailure(activityLog, toolId)` 判断工具近期是否有安装/更新失败记录。
   - 在工具卡片上展示“AI 修复”按钮（不再仅依赖瞬时的 `toolState.status === "failed"`）。
   - 详情抽屉和日志中心的 AI 修复按钮保持可用，并在修复同一工具时禁用/显示 spinner。

3. **AI 修复超时与取消保护**
   - 在 `electron/main.cjs` 的 `fixToolWithAi` 中为 `fetchAiContent` 传入 `AbortController.signal`，设置总超时约 90 秒。
   - 请求被中止或超时时返回清晰错误信息。
   - 渲染层在 `finally` 中清空 `aiRepairingToolId`，避免 UI 卡死。

4. **MSIX / App Installer 环境检测与修复**
   - 在 `src/core/environment.ts` 的 `EnvironmentSnapshot` 中增加：
     - `appInstallerAvailable?: boolean`
     - `appInstallerVersion?: string`
     - `uiXamlInstalled?: boolean`
     - `uiXamlPackages?: string[]`
   - 扩展 `EnvironmentCheckId` 为 `"app-installer"` / `"ui-xaml"`。
   - 在 `electron/main.cjs` 的 `getSystemInfo` PowerShell 脚本中增加：
     - `Get-AppxPackage -Name "Microsoft.DesktopAppInstaller"`
     - `Get-AppxPackage -Name "Microsoft.UI.Xaml.*"`
   - 新增检查项：
     - App Installer 缺失时显示 warning，修复入口跳转 Microsoft Store 的 App Installer 页面。
     - UI.Xaml 缺失时显示 warning，修复入口尝试通过 winget 安装 `Microsoft.UI.Xaml.2.8`；winget 不可用时给出 Store 链接。
   - 更新 `src/core/environment.test.ts`。

5. **AI 修复 prompt 识别 MSIX 失败**
   - 在 `electron/main.cjs` 中新增 `looksLikeMsixFailure(errorMessage)` 辅助函数。
   - 关键词包括：`App Installer`、`msix`、`Add-AppxPackage`、`Microsoft.UI.Xaml`、`0x80073`、`deployment`、`store` 等。
   - 命中时向 prompt 注入指令：优先选择非 MSIX 安装形态（如 winget exe/msi 源、GitHub Release 便携版），避免再次依赖 MSIX/App Installer。

6. **测试与基线更新**
   - 更新/新增测试：
     - 新环境检查与评分（已完成）。
     - `getLatestToolFailure` 在 AI 修复入口判断中的使用。
     - `fixToolWithAi` 的状态流转（可 mock IPC）。
   - 更新 `docs/aegis/baseline/baseline.md`：在 **Durable Contracts** 中说明 AI 修复入口可基于持久化操作历史派生，环境健康检查已覆盖 MSIX/App Installer。
   - 在 `docs/aegis/plans/` 下新增本计划文件，并更新 `docs/aegis/INDEX.md`。

7. **验证与打包**
   - 运行 `npm test`、`npm run build`、`npm run package:win`。
   - 记录手动冒烟测试结果。

8. **后续追加项（v0.7.5 范围）**
   - 工具详情抽屉（`ToolDetailDrawer`）增加“路径”按钮，与工具卡片管理菜单保持一致。
   - 环境体检新增 **PowerShell 7** 检查项：
     - 检测 `pwsh` 是否可用及版本；
     - 状态为 `warning`（推荐安装，非必需）；
     - 修复入口使用 winget 安装 `Microsoft.PowerShell`；
     - 当 winget 不可用时给出 Store/官网链接。
   - 更新 `src/core/environment.test.ts` 覆盖 PowerShell 7 检查。

# 风险

- `src/App.tsx` 已非常庞大，新增状态会增加维护面。如可行，后续可将 AI 修复相关状态提取到本地 hook 或 `src/core/aiRepair.ts`。
- MSIX / Appx 包查询在某些系统上可能较慢或需要提权；保持只读、fail-open，避免把缺失值判为 danger。
- 90 秒 AI 超时对慢速端点可能偏紧，后续可考虑在设置中暴露可配置值。
- MSIX 关键词可能误伤非 MSIX 工具；通过仅当关键词命中时才注入指令来降低误伤。
