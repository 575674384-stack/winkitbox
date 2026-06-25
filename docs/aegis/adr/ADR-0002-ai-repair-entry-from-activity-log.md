# ADR-0002: AI Repair Entry Derived from Persistent Activity Log

## Status

Accepted

## Context

After a tool install or update fails, WinKitBox refreshes tool detection. The transient runtime status (`toolState.status === "failed"`) could be overwritten by the refresh, causing the AI repair button to disappear from the tool card and forcing the user to open Log Center to find the repair action. This created a confusing "the button was there, then it was gone" experience.

## Decision

The AI repair entry point may be derived from the persistent operation history (`activityLog`) instead of relying solely on the transient runtime `failed` state. A helper `getLatestToolFailure(activityLog, toolId)` determines whether a tool has a recent install/update failure and therefore qualifies for an AI repair action.

The in-progress repair state (`aiRepairingToolId`) remains transient and is cleared in `finally` to prevent UI lockup.

## Consequences

- AI repair remains available even after detection refresh overwrites the runtime failure state.
- The activity log becomes a durable input to UI actions, not just a read-only history.
- Repair button state and repair-in-progress state are decoupled: one is history-driven, the other is action-driven.
- Future changes to activity log schema must consider this consumer.
