# WinKitBox Aegis Docs

This directory stores durable project context for Aegis-assisted work.

## Current Documents

- `baseline.md`: current project baseline, architecture map, source-of-truth rules, and verification expectations.
- `specs/2026-06-16-fluent-polish-v0.2.2-brief.md`: historical v0.2.2 visual polish brief. It is retained for context only and does not describe the current product direction.

## How To Use

Read `baseline.md` before medium or larger changes, cross-module work, release work, AI/tool-install changes, Electron IPC changes, or anything touching system/network/PowerShell behavior.

For small UI copy/style edits, `AGENTS.md` plus the local files being changed is usually enough.

## Update Policy

Update this directory when one of these changes:

- product shape or navigation model;
- install, uninstall, update, detection, or launch contracts;
- AI trust boundary or candidate validation behavior;
- user settings, custom tool persistence, or import/export format;
- Electron IPC surface;
- release and verification process.

