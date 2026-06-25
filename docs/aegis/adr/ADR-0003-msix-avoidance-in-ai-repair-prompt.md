# ADR-0003: MSIX / App Installer Avoidance in AI Repair Prompt

## Status

Accepted

## Context

Several tools (for example Windows Terminal distributed as a Store-signed MSIX package) fail to install on Windows versions or configurations where the MSIX deployment stack is incomplete. Common failure signatures include `App Installer`, `msix`, `Add-AppxPackage`, `Microsoft.UI.Xaml`, `0x80073`, `deployment`, and `store`. When the AI repair workflow was given only the raw error message, it sometimes suggested another MSIX-only source, leading to repeated failures.

## Decision

Add a lightweight classifier `looksLikeMsixFailure(errorMessage)` in the main-process AI repair path. When the classifier hits, the repair prompt receives an extra instruction telling the model to prefer non-MSIX install shapes: direct `.exe`/`.msi` installers, portable archives, or winget packages that deliver an executable installer. The classifier is keyword-based and fail-open (no hit = no extra instruction).

This is a prompt-level mitigation only. No new `Tool` install type is added for MSIX.

## Consequences

- Reduces the chance that AI repair recommends another MSIX-only source for MSIX-related failures.
- Keeps the trust boundary unchanged: candidates are still validated through the existing AI candidate validation pipeline.
- The keyword list may need tuning if it produces false positives on non-MSIX tools.
- Environment health checks for App Installer and UI.Xaml provide a complementary human-visible signal; they do not replace this prompt-level guard.
