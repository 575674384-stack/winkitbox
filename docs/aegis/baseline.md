# WinKitBox Project Baseline

Updated: 2026-06-20  
Current release at last update: v0.6.2

## Product Intent

WinKitBox is a Windows desktop toolbox for restoring and maintaining a familiar PC environment. It prioritizes practical local use over enterprise policy management.

The core product loop is:

1. Browse built-in tools or add custom tools.
2. Select tools and categories.
3. Generate install, uninstall, update, or repair actions.
4. Execute explicit PowerShell actions through Electron.
5. Refresh status and write operation/AI logs.

The app should remain dense, utilitarian, and Windows-focused. It is not a landing page or a general package manager.

## Stack And Runtime

- Desktop runtime: Electron.
- Renderer: React + TypeScript + Vite.
- Tests: Vitest + jsdom.
- Packaging: electron-builder.
- Icons: lucide-react in UI, app icon assets under `assets/icon/`.
- Shell target: Windows PowerShell.

Run normal commands from the repo root:

```powershell
npm test
npm run build
npm run package:win
```

If child processes cannot find Node:

```powershell
$env:Path='C:\Program Files\nodejs;'+$env:Path; npm test
```

## Current Product Surface

- Tool catalog with built-in categories plus user-defined categories.
- Custom Add category is protected and is the default target for AI/user-added tools.
- Tool cards support install/reinstall, open, details, manage/uninstall, category assignment, and drag-to-category classification.
- User-created categories can be reordered by drag-and-drop.
- Add Tool page owns local file, link-based, and manual custom-tool creation.
- Settings page should stay focused on global settings: tool directory, updates, proxy, theme, sync/config, and AI model settings.
- Log Center owns operation history, realtime output, and AI logs.
- Notes owns lightweight local notebooks for arbitrary user text.
- GitHub Discover owns rankings plus AI-assisted project recommendation and direct AI add.
- Windows system page owns local system info, network/DNS actions, and environment health checks.
- Tool Update Center separates update detection from update execution.
- Tool Source Health owns network/source probes and exposes user-triggered repair actions through the existing AI repair workflow.

## Source Of Truth

- `src/core/catalog.ts`: built-in tool definitions, categories, tool shape, custom category constants.
- `src/core/planner.ts`: install/uninstall PowerShell generation.
- `src/core/toolUpdates.ts`: update strategy and update command generation.
- `src/core/toolSourceHealth.ts`: install-source descriptor, status, and summary model.
- `src/core/launcher.ts` and `electron/windowsTools.cjs`: launcher and detection behavior.
- `src/core/aiTool.ts`: renderer-side trust boundary for AI-generated tool candidates.
- `electron/aiCandidateValidation.cjs`: main-process live validation for AI-generated install sources.
- `src/core/config.ts`: export/import and custom-tool normalization.
- `src/core/activityLog.ts`, `src/core/aiLog.ts`, `src/core/taskQueue.ts`: persistent operation, AI, and task state models.
- `src/core/environment.ts`: Windows environment health model and repair action mapping.
- `src/core/hardware.ts`: renderer-side hardware normalization such as virtual GPU filtering.
- `src/core/notebook.ts`: local note normalization and mutation helpers.
- `electron/main.cjs`: Electron main process, IPC handlers, PowerShell execution, settings, update checks, AI requests, proxy behavior.
- `electron/preload.cjs` and `src/types/electron.d.ts`: renderer bridge contract. Keep these synchronized for new IPC.

## Durable Contracts

### Tool Definitions

Supported install shapes are:

- `wingetId` for reliable winget packages;
- `installer` with direct URL or GitHub release asset pattern;
- `portable` with direct URL or GitHub release asset pattern;
- local launcher/installer/archive sources for user-added tools;
- collection-only tools that are stored in the toolbox but not installed by WinKitBox.

When changing a tool source, keep install, uninstall, update, detection, and launch behavior aligned.

### AI Boundary

AI calls are user-triggered and use OpenAI-compatible settings stored in Electron user data, not the repository.

AI add/repair must not become arbitrary PowerShell generation. Link-based AI candidates are constrained to structured install shapes and are validated before saving:

- winget candidates require a package id;
- direct download URLs are probed with HEAD/GET;
- GitHub release asset patterns must match a current asset and that asset URL must probe successfully;
- if validation fails, the main process retries once with validation errors and live source context;
- if the retry fails, no custom tool should be saved.

Local-file AI analysis may suggest handling modes, but the user still confirms the resulting tool.

### Update Behavior

Detection and update execution are separate.

- Detection must remain read-only.
- winget detection should query local/latest versions without running upgrade.
- Updates only run after explicit user action.
- Some tools can override winget update commands with `customUpdateCommand`; this is used for packages such as WeChat Input where upstream metadata requires interactive forced install for update.
- Unknown-version tools should show a clear reinstall/refresh path rather than pretending precise version knowledge.

### Persistence

Custom tools, custom categories, category overrides, theme settings, proxy settings, AI settings, and tool root path live in Electron user data settings. Renderer localStorage may be used for lightweight local UI state and migration fallback.

User-added tools and categories must survive app updates. Import/export config should remain lightweight and avoid embedding logs or generated packages.

### Logs

Operation history and AI logs are separate from settings.

- Operation history tracks install, uninstall, update, update-check, launch, AI, config, system, category, and theme operations.
- AI logs preserve detailed AI responses for recommendations, tool analysis, local analysis, repairs, and model operations.
- Logs should redact tokens and API keys.

### System And Network Actions

Network, DNS, UTF-8 beta, and environment repair actions must be explicit user actions. Prefer typed IPC payloads over passing raw scripts from the renderer.

Changes that affect system state should write operation history and expose clear success/failure feedback.

## Verification Baseline

For normal code changes:

```powershell
npm test
npm run build
```

For Electron, PowerShell, install/update/detection, tray, or release changes:

```powershell
npm run package:win
```

Before release:

1. Bump `package.json` and `package-lock.json`.
2. Add release notes in `AGENTS.md`.
3. Run tests, build, and Windows package.
4. Upload both Setup and Portable `.exe` files to a new GitHub Release tag.
5. Verify the release assets and latest release metadata.

## Known Current Notes

- `README.md` is user-facing and may lag behind recent UI wording; `AGENTS.md` and this baseline should be treated as the stronger maintainer context.
- Old image assets may remain in `assets/backgrounds/`; the active built-in theme set is controlled by code, not file presence alone.
- Do not commit generated packages, logs, local signing certificates, `node_modules`, `dist`, or `release`.
- If a token appears in chat or logs, treat it as exposed and rotate it.
