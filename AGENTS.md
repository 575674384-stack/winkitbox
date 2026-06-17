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

## Release Notes

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
