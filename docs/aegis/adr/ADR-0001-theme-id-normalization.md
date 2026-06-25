# ADR-0001: Theme ID Normalization Shared Between Renderer and Main Process

## Status

Accepted

## Context

WinKitBox supports multiple built-in image themes. The renderer declares theme IDs in `src/core/themes.ts`, while the Electron main process persists and validates the user's selected theme in `electron/main.cjs`. During v0.7.1 we discovered that adding new themes in the renderer alone was not enough: persisted theme IDs could become invalid or be rejected by the main process, causing the active theme to fall back silently or fail to apply after restart.

The previous state duplicated the allowed-theme list in two places with slightly different normalization rules.

## Decision

Introduce a shared normalization module `electron/themeIds.cjs` that owns the canonical set of valid theme IDs and is imported by both the main process and (indirectly) referenced by the renderer. New themes must be added to `electron/themeIds.cjs` **and** to `src/core/themes.ts` for the UI to recognize them.

## Consequences

- Theme IDs are normalized in exactly one place.
- Renderer and main process stay in sync without manual duplication of validation logic.
- Adding a new theme now requires a dual update; this is documented in the baseline and in this ADR.
- Old per-theme background logic that reused the active theme image for page headers was retired in favor of per-page topbar artwork.
