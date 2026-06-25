# WinKitBox Aegis Docs

This directory stores durable project context for Aegis-assisted work.

For the workspace map and document status, start with [`INDEX.md`](INDEX.md).

## Current Documents

- `baseline/baseline.md`: current project baseline, architecture map, source-of-truth rules, and verification expectations.
- `specs/2026-06-16-fluent-polish-v0.2.2-brief.md`: historical v0.2.2 visual polish brief. It is retained for context only and does not describe the current product direction.
- `plans/2026-06-20-v0.6.1-toolbox-polish.md`: v0.6.1 toolbox polish/release plan.
- `plans/2026-06-20-v0.6.2-polish-repair-ai-notes.md`: v0.6.2 polish, source-health repair, AI notes, and release plan.
- `plans/2026-06-21-v0.7.1-ui-performance-release.md`: v0.7.1 UI polish, performance, theme normalization, and release plan.
- `plans/2026-06-21-v0.7.2-icons-notes-wiki-themes-release.md`: v0.7.2 page icons, Notes workbench, WIKI, new themes, and release plan.
- `adr/ADR-0001-theme-id-normalization.md`: theme ID normalization shared between renderer and main process.
- `adr/ADR-0002-ai-repair-entry-from-activity-log.md`: AI repair entry derived from persistent activity log.
- `adr/ADR-0003-msix-avoidance-in-ai-repair-prompt.md`: MSIX / App Installer avoidance in AI repair prompt.
- `work/2026-06-22-ai-repair-msix-health/`: active work record for the AI repair + MSIX health plan.

## How To Use

Read `baseline/baseline.md` before medium or larger changes, cross-module work, release work, AI/tool-install changes, Electron IPC changes, or anything touching system/network/PowerShell behavior.

For small UI copy/style edits, `AGENTS.md` plus the local files being changed is usually enough.

## Update Policy

Update this directory when one of these changes:

- product shape or navigation model;
- install, uninstall, update, detection, or launch contracts;
- AI trust boundary or candidate validation behavior;
- user settings, custom tool persistence, or import/export format;
- Electron IPC surface;
- release and verification process.

