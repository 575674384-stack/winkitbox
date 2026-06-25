# Changelog

## v0.7.8

### 改进

- 左侧边栏视觉回滚与简化：
  - 去掉圆角和浮出边距，恢复为贴边的直边面板。
  - 分类列表（红框区域）去掉主题相关的渐变/半透明背景底色。
  - 分类按钮默认、hover、active 均改为透明背景，仅保留文字高亮和 active 左侧细指示线。
  - 仅保留分类项右侧的数字徽标，其他导航项后的徽标/标签全部移除。

### 测试与验证

- `npm test` 全部 155 个测试通过。
- `npm run build` 通过。
- `npm run package:win` 成功生成签名后的 Setup 与 Portable 包。

## v0.7.7

### 修复

- 修复内置工具点击移除后卡片不消失的问题：`electron/main.cjs` 的 `writeSettings` 序列化时漏掉了 `hiddenToolIds`，导致移除操作虽然日志显示成功，但设置文件没有保存隐藏列表，卡片继续显示。

### 测试与验证

- `npm test` 全部 155 个测试通过。
- `npm run build` 通过。
- `npm run package:win` 成功生成签名后的 Setup 与 Portable 包。

## v0.7.6

### 修复

- 修复 AI 修复内置工具后产生同名工具冲突的问题：
  - AI 修复后，原内置工具条目会被加入 `hiddenToolIds`，界面只显示修复后的自定义覆盖版本；
  - `allTools` 现在按 `id` 去重，并过滤被隐藏的工具，避免重复卡片和选择异常。
- 修复 AI 修复按钮显示条件过宽的问题：
  - 工具卡片和详情抽屉的 AI 修复按钮现在只在工具当前状态为 `failed` 时显示；
  - 不再因为历史失败记录一直显示按钮。
- 修复自定义/内置工具移除不一致的问题：
  - 所有工具卡片（包括内置工具）都显示“移除”按钮；
  - 移除内置工具时，将其加入 `hiddenToolIds` 从界面隐藏，而不是只能移除自定义工具。

### 改进

- 导出/导入配置现在支持 `hiddenToolIds`。
- 主进程设置序列化新增 `hiddenToolIds` 字段。

### 测试与验证

- `npm test` 全部 155 个测试通过。
- `npm run build` 通过。
- `npm run package:win` 成功生成签名后的 Setup 与 Portable 包。

## v0.7.5

### 新增

- 工具详情抽屉（ToolDetailDrawer）中新增“路径”按钮，与工具卡片管理菜单保持一致，点击后打开工具安装目录。
- 系统环境体检新增 PowerShell 7 检测项：
  - 仅作为推荐安装项（warning 级别），不影响 danger 计数；
  - 缺失时提供通过 winget 安装 `Microsoft.PowerShell` 的修复入口；
  - winget 不可用时修复按钮自动禁用并提示“需要先修复 winget”。

### 测试与验证

- 更新 `src/core/environment.test.ts`，覆盖 PowerShell 7 检查项的健康、缺失、推荐修复及汇总统计。
- `npm test` 全部 155 个测试通过。
- `npm run build` 通过。
- `npm run package:win` 成功生成签名后的 Setup 与 Portable 包。

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
