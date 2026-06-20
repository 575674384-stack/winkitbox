# WinKitBox v0.2.2 Fluent 风格精修设计简案

Status: historical. This brief described a v0.2.2 visual polish pass and is not the current WinKitBox baseline. For current project context, read `docs/aegis/baseline.md`.

## 目标
在 v0.2.1 已经完成的现代卡片化 UI 基础上，进一步向 **Windows 11 / Fluent 2** 视觉靠拢，提升专业感、耐看度和原生协调感。完全保留现有功能与交互逻辑，只做视觉层优化。

## 不在范围内
- 不新增引导页/ onboarding（用户明确排除）
- 不改业务逻辑、状态管理、IPC 接口
- 不改主题皮肤的配色定义（但要让默认主题更 Fluent）

## 要做的 4 项改进

### 1. Mica / Acrylic 玻璃质感
- 让 `sidebar` 和 `plan-panel` 更像 Windows 11 侧边栏：
  - 提升 `backdrop-filter: blur()` 强度
  - 使用多层半透明背景（panel-bg 带 alpha）
  - 面板边缘加 1px 高光边框，营造“浮在背景上”的感觉
  - 自定义背景图模式下也要保证文字可读
- 工作区背景从平面渐变升级为更 subtle 的 Fluent 风格网格/噪点感（可选 subtle dot pattern）

### 2. 安装进度步骤条
- 右侧计划面板的进度区域从单一进度条，改为：
  - 顶部：4 个步骤圆点（等待执行 → 检测 → 下载/安装 → 完成）
  - 当前步骤高亮，已完成步骤显示对勾
  - 保留下方进度条作为总进度补充
- 数据来自现有的 `InstallProgress`（`completed / total / succeeded / failed`），不新增数据源

### 3. 工具 Logo 统一占位图
- 当 `getToolLogoUrl(tool)` 返回的图标加载失败时，不再显示分类图标，而是显示：
  - 工具名称前 1–2 个字符（中文取首字，英文取首字母）
  - 背景按分类分配柔和渐变色
  - 文字白色、加粗、居中
- 提升无网络或 logo 缺失时的界面完整度

### 4. 空状态插画/插图
- 为以下场景增加统一的空状态组件：
  - 工具目录搜索无结果
  - 未选择任何工具时的计划面板
  - 系统页未读取到网卡
  - GitHub 榜单加载失败或无结果
- 视觉：简单几何图形 + 主色点缀 + 一句说明文字 + 操作按钮（如“清除搜索”“刷新”）
- 不使用外部图片，纯 CSS/SVG 实现，避免网络依赖

## 验收标准
- `npm test` 全部通过
- `npm run build` 成功
- 打包后在 Windows 上启动，侧边栏和计划面板有明显玻璃感
- 进度步骤条在安装/卸载时能正确反映阶段
- 断网情况下工具卡片仍有统一占位图
- 空状态页在对应场景出现，且不影响正常数据展示

## 影响文件
- `src/styles.css`（主要改动）
- `src/App.tsx`（进度步骤条、占位图、空状态 JSX）
- `src/DiscoverView.tsx`（榜单空状态）
- `package.json` / `package-lock.json`（版本号 0.2.1 → 0.2.2）
