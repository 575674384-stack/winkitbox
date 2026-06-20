# AGENTS.md

This file is the working guide for AI coding agents and future maintainers of WinKitBox.

## Project Summary

WinKitBox is a Windows desktop toolbox for rebuilding a familiar PC environment quickly. It is an Electron + React + Vite app that can:

- browse and select common Windows tools;
- generate and run install or uninstall PowerShell plans;
- detect installed tools and launch them from the app;
- manage portable tools under a configurable WinKitBox tool directory;
- show local system/network/DNS information and apply IP or DNS changes through elevated PowerShell;
- recommend public DNS providers and test DNS latency against preset or custom domains;
- browse Windows-focused GitHub weekly/monthly rankings with proxy support and Chinese translation;
- add custom GitHub tools through an OpenAI-compatible AI workflow;
- export/import lightweight user configuration for syncing selected tools, settings, and AI-added tools;
- package Windows setup and portable builds.

The app is for personal Windows use first. Keep changes practical, local, and conservative.

## Stack

- Runtime: Electron
- UI: React + TypeScript + Vite
- Tests: Vitest + jsdom
- Packaging: electron-builder
- Icons: lucide-react in UI, app icon under `assets/icon/`
- Shell target: Windows PowerShell

## Important Commands

Run commands from the repository root.

```powershell
npm install
npm run dev
npm run preview -- --port 4173
npm test
npm run build
npm run package:win
```

If `npm` can be found but child processes cannot find `node`, temporarily prepend Node to PATH for that command:

```powershell
$env:Path='C:\Program Files\nodejs;'+$env:Path; npm test
```

## Project Map

- `src/App.tsx`: main catalog UI, local system page, settings page, AI-add-tool flow, install/open/uninstall actions.
- `src/DiscoverView.tsx`: Windows-focused GitHub weekly/monthly ranking view, proxy mode, token input, translation flow.
- `src/styles.css`: full app styling. Keep it responsive for the desktop window minimum size.
- `src/core/catalog.ts`: tool catalog data. Prefer official, open-source, or stable direct download sources.
- `src/core/aiTool.ts`: validates AI-generated tool metadata and converts it into catalog entries.
- `src/core/config.ts`: lightweight export/import config and custom tool helpers.
- `src/core/network.ts`: public DNS recommendations, DNS latency ranking helpers, and DNS test domain presets.
- `src/core/planner.ts`: install/uninstall command generation and PowerShell script rendering.
- `src/core/launcher.ts`: launcher descriptors and logo URL fallback logic.
- `src/core/toolStatus.ts`: runtime install/open/checking states and progress snapshots.
- `src/core/runEvents.ts`: parser for structured PowerShell progress events.
- `src/core/github.ts`: GitHub trend request helpers.
- `src/core/translation.ts`: translation helpers.
- `src/core/update.ts`: version comparison and update availability helpers.
- `electron/main.cjs`: Electron main process, menu/tray/window behavior, IPC, PowerShell execution, settings, update checks.
- `electron/preload.cjs`: safe renderer bridge. Add new renderer APIs here and in `src/types/electron.d.ts`.
- `electron/windowsTools.cjs`: generated PowerShell for installed-tool detection and launching.
- `electron/trayController.cjs`: tray icon/menu behavior.
- `scripts/package-win.cjs`: Windows packaging wrapper.
- `scripts/sign-win.cjs`: local code-signing helper.

## Editing Rules

- Keep install, uninstall, launch, and detection behavior aligned. If a tool path changes in `planner.ts`, check `launcher.ts` and detection behavior too.
- Add or update tests for core behavior before changing shared logic in `src/core/`.
- Do not turn website-only downloads into browser jumps unless there is no stable direct installation route.
- Keep the UI dense and utilitarian. This is a toolbox, not a landing page.
- Prefer lucide icons already used by the app.
- Avoid adding hidden network calls outside the user's explicit actions, except lightweight update checks.
- Keep AI calls user-initiated. Model listing, connection tests, and tool generation should only run after the user clicks a button.
- Do not hard-code personal access tokens, private download links, local absolute paths, or machine-specific secrets.
- Do not commit generated packages, local certificates, screenshots, logs, `node_modules`, or build output.

## Tool Catalog Guidance

When adding a tool to `src/core/catalog.ts`:

- provide a clear Chinese name/summary/description;
- prefer `wingetId` when the package is reliable;
- for portable tools, define `portable.downloadUrl`, `archiveName`, `targetDirName`, and `executable`;
- for installer tools, define an installer source and launcher hints;
- include `repoUrl` and stars when useful, especially for GitHub open-source tools;
- add launch hints in `launch.startMenuNames`, `launch.commands`, or `launch.appUserModelIds`;
- update planner and launcher tests if the new tool uses a new install shape.

## AI Tool Add Guidance

The settings page has an AI-assisted custom tool flow. The user provides an OpenAI-compatible API URL, API key, model name, and a GitHub repository homepage.

Implementation notes:

- AI settings are stored in the Electron user data settings file, not in the repository.
- The renderer asks the main process to list models, test connectivity, and generate a tool.
- `electron/main.cjs` fetches GitHub repository/release metadata, calls `/v1/chat/completions`, and returns structured JSON.
- `src/core/aiTool.ts` is the trust boundary. It only accepts direct install shapes: `winget`, GitHub installer assets, or GitHub portable assets.
- Do not allow AI output to become arbitrary PowerShell. If a new install shape is needed, add a typed catalog shape and tests first.

## System And Network Guidance

The local system page reads adapter/IP/DNS information through PowerShell and applies IP/DNS changes with elevation.

- Keep network changes explicit and user-confirmed.
- DNS latency testing should remain user-triggered and supports preset or user-supplied domains.
- Prefer small structured IPC payloads instead of passing raw scripts from the renderer.

## Verification Checklist

For normal source changes:

```powershell
npm test
npm run build
```

For Windows desktop behavior changes:

```powershell
npm run package:win
```

Then smoke-test the portable build in `release/`:

- app starts and shows the expected version;
- top app menu is hidden;
- tray minimize/restore still works;
- install/uninstall plans still render;
- custom tool directory still affects portable paths;
- settings export/import stays under 1MB;
- AI add tool flow shows model detection, connectivity test, and GitHub URL generation controls;
- local system page shows adapters and DNS recommendations;
- GitHub update check can read the latest public release.

## Release Checklist

Before packaging and publishing a release:

1. Bump `version` in `package.json` to the next version (e.g. `0.3.5` → `0.3.6`).
2. Add a new `### vX.Y.Z` section under **Release Notes** below.
3. Run `npm test` and `npm run build`.
4. Run `npm run package:win` to produce signed Setup + Portable executables.
5. Create a **new** GitHub release with the matching tag; do not overwrite an existing release tag.

## Release Notes

### v0.4.1

- Added in-page feedback to Settings actions so tool directory, update, proxy, theme, AI setting, and config import/export operations no longer rely only on realtime logs.
- Added AI model panel feedback for model detection and connection testing, including success and error states.
- Added in-page feedback to the Add Tool workflow for AI analysis, validation warnings, and successful local/link/manual additions.
- Added React/Vitest coverage for Settings and Add Tool feedback behavior.

### v0.3.12

- Fixed the AI model picker dialog so long model lists have a dedicated vertical scrollbar.
- Added a stable scrollbar gutter and styled scrollbar track/thumb for clearer model-list scrolling.
- Kept manual model entry unchanged while improving detected-model selection readability.

### v0.3.11

- Moved local, link-based, and manual custom-tool creation out of Settings into a dedicated Add Tool page.
- Added a unified Add Tool workflow with Local File, Link Add, and Manual Add tabs, plus reusable previews and the existing custom-tool list.
- GitHub ranking and AI assistant add buttons now open the Add Tool link workflow with the repository URL prefilled instead of adding immediately.
- Simplified Settings so it keeps global configuration only, including tool directory, updates, proxy, theme, sync, and AI model settings.
- Reworked AI model detection into a searchable model-picker dialog while keeping manual model entry available.

### v0.3.10

- Moved logs out of Settings into a dedicated Log Center page with operation-history and realtime-output tabs.
- Added log search, status/type/time filters, quick filters, per-tool scoping, detailed records, and JSON/TXT export.
- Expanded persistent activity history with redacted command summaries, raw output snippets, durations, and metadata.
- Added log entry points from failed tool cards, tool update rows, and the Windows system page for faster troubleshooting.
- Settings now focuses on configuration only; log history and clear-history controls live in the Log Center.

### v0.3.9

- Upgraded the existing Windows environment check into a health panel with score, status counts, per-item repair buttons, and recommended one-click repairs.
- Added WebView2 Runtime detection alongside winget, PowerShell, .NET Desktop Runtime, VC++ runtime, long paths, and UTF-8 beta checks.
- Added typed repair actions for .NET Desktop Runtime, VC++ runtime, WebView2 Runtime, long path enablement, App Installer guidance, and UTF-8 beta toggling.
- Environment repair actions now write to the operation history so system fixes are visible in the log center.
- Refined the system page UI with clearer health cards, status pills, repair CTAs, and better responsive layout.

### v0.3.8

- Added a persistent operation history stored outside `settings.json`, keeping recent install, uninstall, update, update-check, launch, AI, and config actions.
- Settings now shows realtime logs and operation history together, with counts, latest failure summary, source labels, exit codes, and a clear-history action.
- AI repair now reuses the latest failed operation context for the selected tool.
- Rewrote the README with a clearer product overview, workflow, security boundary, project map, generated hero art, and a real app screenshot.

### v0.3.7

- Separated tool update detection from actual updates: winget tools now use read-only version checks and only run `winget upgrade` after the user clicks Update.
- Cleaned update-center messages so winget errors no longer flood tool cards with raw command output.
- Simplified local tool adding into a file-first flow with automatic handling suggestions, optional AI analysis, and collapsed advanced settings.
- Fixed Windows environment checks so `.NET Desktop Runtime` only counts `Microsoft.WindowsDesktop.App` runtimes and displays concise version details.

### v0.3.6

- Fixed winget tool-update detection actually running upgrades: `winget upgrade` now uses `--what-if` for dry-run detection only.
- Redesigned the manual "Add Tool" form: removed the 5 mode tabs and replaced them with a single upload-file + AI-analyze flow.
- Added `ai-analyze-local-file` IPC and prompt so AI can decide whether a file should be collected, installed, extracted from ZIP, or handled as a custom command.
- Users now only need to pick a file, enter a name/remark, and let AI infer launch/uninstall/ZIP-executable settings.

### v0.3.4

- Added a quick "selected tools only" filter from the dashboard selected-count card.
- Clicking the selected or installed dashboard card now toggles its filter off when it is already active.
- Category navigation clears quick filters so the catalog view does not stay unexpectedly narrowed.

### v0.3.3

- Fixed post-install and post-uninstall status refresh so tools no longer stay stuck as "安装中" after the command has finished.
- Added a post-run detection merge mode that can override active tool states while keeping normal background detection from interrupting running installs.
- The left navigation and right install plan panels now reuse the active theme image with a soft readability overlay instead of flat solid backgrounds.

### v0.3.2

- Added an AI Assistant section under the GitHub ranking view.
- The assistant reuses the saved AI API URL, key, and model to recommend multiple Windows-friendly GitHub open-source projects from a user request.
- AI recommendations can be opened on GitHub, copied, or added to the toolbox through the existing AI add-tool workflow and selected category.
- Removed the unused "候选" button from GitHub ranking project cards.
- Replaced the app icon with a generated anime-style toolbox mascot icon.

### v0.3.1

- Added two built-in anime-style image themes: mint (浅绿工位) and amber (暖黄工坊), alongside the existing azure theme.
- Generated the new theme images with the built-in image generation tool and kept UI readability by using theme-specific fixed panel opacity/blur values.
- Removed the Settings page panel controls for manual opacity and blur.
- Fixed Czkawka uninstall reliability by using winget portable uninstall flags (`--force --purge`) with fallback package IDs.

### v0.2.28

- Moved the remove button on custom tool cards from the bottom action bar to the right of the category dropdown.
- Styled the remove button as a small pill to align with the category select.

### v0.2.27

- Fixed update downloads not actually going through the configured proxy.
- Added `https-proxy-agent` and wired it into Node.js `https.request` used by update checks and update downloads.
- Proxy agent is recreated whenever system/manual proxy settings change; direct mode clears it.

### v0.2.26

- Added a "移除" button on custom tool cards; clicking it removes the tool from WinKitBox after confirmation (installed tools are removed from the list, not uninstalled).
- Fixed custom category assignment not persisting: `toolCategoryOverrides` is now saved to settings.
- Custom tools moved to another category update their own `category` field directly instead of relying on overrides.

### v0.2.25

- Fixed app self-update download failures (`ECONNRESET`).
- Disabled multipart parallel `Range` downloads; update packages now use a single stream with resume support and automatic retry.
- Fixed redirect handling: redirect response bodies are now consumed before following the location header, preventing connection resets.
- Proxy settings now apply to Node.js `https`/`http` requests as well as Electron renderer requests, so update checks, update downloads, and AI API calls respect the configured proxy.

### v0.2.24

- Custom tools in the Settings page now show an "卸载并移除" button.
- Clicking it reuses the existing single-tool uninstall flow, then removes the tool from the custom list.

### v0.2.23

- Added proxy settings to the Settings page.
- Users can choose between system proxy, direct connection, or a manually entered proxy address.
- The configured proxy is applied globally and affects GitHub API requests, translation, update checks, and update downloads.
- DiscoverView now reads proxy settings from the global settings; GitHub Token remains configurable in the GitHub ranking panel.

### v0.2.22

- Reduced themes to a single built-in image theme: azure (晴空天台).
- Removed sakura and neon image themes.
- Ensured the azure rooftop wallpaper is clearly visible inside the workspace area while keeping cards readable with frosted-glass transparency.
- Fixed GitHub update check 403 errors by switching from `net.fetch` to Node `https` and adding the required `X-GitHub-Api-Version` header.

### v0.2.21

- Theme system refactored to keep only image themes: sakura, neon, and azure.
- Removed the four solid color themes (light, slate, teal, rose).
- Fixed a bug where image backgrounds were invisible: `themeId` is now normalized to image theme IDs, and custom backgrounds are applied per image theme.
- Settings page theme picker now shows image theme cards with a selected checkmark and buttons to upload or reset custom backgrounds.
- Added theme-specific color schemes and improved card hover/active visual effects.

### v0.2.20

- Improved automatic update download logic: switched to Node `https`/`http` modules.
- Large update files are downloaded with 4 parallel `Range` chunks and automatically fall back to a single stream.

### v0.2.19

- DNS latency testing now supports multiple preset domains and a user-defined custom domain.
- Result headers and log messages show the tested domain.

### Earlier releases

Release artifacts are generated under `release/` and ignored by Git. Upload only the final setup and portable `.exe` files to GitHub Releases.

Typical asset names:

- `WinKitBox-<version>-Setup-x64.exe`
- `WinKitBox-<version>-Portable-x64.exe`

The app's built-in update check reads:

```text
https://api.github.com/repos/575674384-stack/winkitbox/releases/latest
```

So the public GitHub Release tag should match the package version, for example `v0.1.9`.

## Security Notes

- Never commit GitHub tokens, private certificates, PFX passwords, or generated signing keys.
- The local signing certificate under `certs/` is intentionally ignored.
- If a token appears in chat, terminal history, or logs, treat it as exposed and rotate it.
- Git remotes must not contain embedded credentials. Use temporary auth headers or a credential manager instead.
