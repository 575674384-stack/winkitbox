# Architecture Decision Records

This directory records durable architecture decisions for WinKitBox. An ADR is added when a decision is hard to reverse, surprising without context, or involves a real trade-off that future maintainers need to understand.

## Active ADRs

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-0001](ADR-0001-theme-id-normalization.md) | Theme ID normalization shared between renderer and main process | Accepted |
| [ADR-0002](ADR-0002-ai-repair-entry-from-activity-log.md) | AI repair entry derived from persistent activity log | Accepted |
| [ADR-0003](ADR-0003-msix-avoidance-in-ai-repair-prompt.md) | MSIX / App Installer avoidance in AI repair prompt | Accepted |

## When to Add an ADR

- A new canonical owner or source-of-truth boundary is introduced.
- A contract, schema, IPC surface, or public API shape changes.
- A compatibility exception or fallback is retained.
- A significant old path is retired.

Prefer updating the baseline for current-state facts and using an ADR for the decision rationale.
