# Task Intent: AI Repair UX + MSIX / App Installer Health

## Requested Outcome

Improve two connected recovery paths in WinKitBox:

1. Make the AI repair flow visible, responsive, and well-feedbacked.
2. Add MSIX / App Installer stack detection and repair guidance to the Windows environment health panel.

## Scope

- Renderer-side AI repair button, spinner, and staged log messages.
- Persistent activity-log-based AI repair entry on tool cards.
- Main-process timeout/cancel protection for `ai-fix-tool` IPC.
- MSIX failure keyword detection and prompt injection in AI repair.
- New environment checks for App Installer and Microsoft.UI.Xaml.

## Non-Goals

- No new `Tool` install type for MSIX.
- No changes to `settings.json` schema.
- No broad refactor of `src/App.tsx` beyond the minimal state needed.

## Risk Hints

- `src/App.tsx` is already large.
- Appx queries may vary by Windows version; keep fail-open.
- Keyword-based MSIX detection may need tuning.

## Baseline Read-Set Hint

- `docs/aegis/baseline/baseline.md` — AI Boundary, AI Repair, Update Behavior, System And Network Actions.
- `AGENTS.md` — verification commands.
- `src/core/environment.ts` — existing environment checks.
- `electron/main.cjs` — existing AI repair flow.
