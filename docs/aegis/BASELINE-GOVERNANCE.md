# WinKitBox Baseline Governance

This file defines how the project baseline is owned, updated, and retired.

## Baseline Owner

The project baseline is a shared artifact. Any agent performing medium or larger work on WinKitBox is responsible for keeping it accurate.

- **Primary owner**: the agent that last touched the relevant contract or source-of-truth file.
- **Reviewer**: subsequent agents that rely on the baseline for context.

## When To Update The Baseline

Update `baseline/baseline.md` after changes to:

- Product surface, navigation model, or page ownership;
- Install, uninstall, update, detection, or launch contracts;
- AI trust boundary or candidate validation behavior;
- User settings, custom tool persistence, import/export format;
- Electron IPC surface or renderer/main bridge;
- Theme, topbar, confirmation, notes, or other durable UI contracts;
- Release and verification process.

Small UI copy/style edits that do not change contracts or behavior usually do not require a baseline update.

## How To Update

1. Edit `baseline/baseline.md` directly.
2. Bump the `Updated:` date and `Current release at last update:` version if applicable.
3. Keep sections concise and factual. Avoid duplicating `AGENTS.md` release notes.
4. If a contract or behavior is retired, move it to the **Recently Retired** section.
5. Verify cross-references in `README.md`, `INDEX.md`, and any active plans/specs still resolve.

## Baseline Structure

The baseline is organized into stable sections:

- **Product Intent**: what WinKitBox is and is not.
- **Stack And Runtime**: technology stack and common commands.
- **Current Product Surface**: features and pages as they exist now.
- **Source Of Truth**: files that own behavior and must be checked before cross-module changes.
- **Durable Contracts**: rules that outlive individual releases.
- **Verification Baseline**: commands and release checklist.
- **Known Current Notes**: caveats, exceptions, and reminders.
- **Recently Retired**: removed patterns kept visible for context.

## Retiring Content

Do not delete historical plans or specs. Mark them as `historical` or `completed` in `INDEX.md`.

When a contract or feature is removed:

1. Remove it from **Current Product Surface** or **Durable Contracts**.
2. Add a concise entry to **Recently Retired** in the baseline.
3. If the retirement itself is significant, add a brief ADR under `adr/`.

## Authority Chain

1. User instructions in conversation (highest).
2. `AGENTS.md` project-specific rules.
3. `docs/aegis/baseline/baseline.md` durable context.
4. `using-aegis` skill discipline.
5. Default agent behavior.

## Verification

Before claiming baseline work is complete:

- All internal links in `docs/aegis/` resolve.
- `INDEX.md` and `README.md` reflect the current workspace state.
- No stale contract contradicts the current source-of-truth files.
