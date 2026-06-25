# WinKitBox Aegis Index

This is the entry point for the WinKitBox Aegis workspace. It maps where durable project context lives and how each document is used.

## Workspace Layout

```
docs/aegis/
├── INDEX.md                       <- this file
├── README.md                      <- workspace overview and update policy
├── BASELINE-GOVERNANCE.md         <- baseline ownership and change rules
├── baseline/
│   └── baseline.md                <- current project baseline (source of truth)
├── adr/                           <- architecture decision records
│   ├── README.md
│   ├── ADR-0001-theme-id-normalization.md
│   ├── ADR-0002-ai-repair-entry-from-activity-log.md
│   └── ADR-0003-msix-avoidance-in-ai-repair-prompt.md
├── specs/                         <- spec briefs and design specs
├── plans/                         <- release and implementation plans
│   └── 2026-06-22-ai-repair-msix-health.md  <- active plan (AI repair + MSIX health)
└── work/                          <- task work records (created per medium/high task)
    ├── README.md
    └── 2026-06-22-ai-repair-msix-health/  <- active work record
```

## How To Use This Workspace

1. **Starting work**: read `baseline/baseline.md` for current product shape, contracts, and verification expectations.
2. **Planning**: if a task is medium/high complexity or touches contracts, add a plan under `plans/`.
3. **Decisions**: for architecture, data model, or cross-module contract changes, add an ADR under `adr/`.
4. **Task records**: for non-trivial tasks, create a work record under `work/<slug>/` with intent, checkpoints, evidence, and reflection.

## Document Status

| Document | Purpose | Status |
|----------|---------|--------|
| `baseline/baseline.md` | Current source-of-truth baseline | active |
| `README.md` | Workspace guide and update policy | active |
| `BASELINE-GOVERNANCE.md` | Baseline maintenance rules | active |
| `adr/ADR-0001-theme-id-normalization.md` | Theme ID normalization decision | accepted |
| `adr/ADR-0002-ai-repair-entry-from-activity-log.md` | AI repair entry derivation decision | accepted |
| `adr/ADR-0003-msix-avoidance-in-ai-repair-prompt.md` | MSIX avoidance in AI repair prompt | accepted |
| `specs/2026-06-16-fluent-polish-v0.2.2-brief.md` | Historical v0.2.2 polish brief | historical |
| `plans/2026-06-20-v0.6.1-toolbox-polish.md` | v0.6.1 plan | completed |
| `plans/2026-06-20-v0.6.2-polish-repair-ai-notes.md` | v0.6.2 plan | completed |
| `plans/2026-06-21-v0.7.1-ui-performance-release.md` | v0.7.1 plan | completed |
| `plans/2026-06-21-v0.7.2-icons-notes-wiki-themes-release.md` | v0.7.2 plan | completed |
| `plans/2026-06-22-ai-repair-msix-health.md` | AI repair UX + MSIX/App Installer health checks | active |
| `work/2026-06-22-ai-repair-msix-health/` | Active work record for the active plan | queued |

## Update Trigger

Update this workspace whenever product shape, contracts, source-of-truth files, or verification expectations change. See `README.md` for the detailed update policy.
