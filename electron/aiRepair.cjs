/**
 * Renderer-safe helper for AI repair logic.
 *
 * This module is kept in `electron/` because it is consumed by the main process,
 * but it only contains pure string checks and can be tested from Vitest.
 */

const MSIX_FAILURE_KEYWORDS = [
  "app installer",
  "msix",
  "add-appxpackage",
  "microsoft.ui.xaml",
  "0x80073",
  "0x80070002",
  "deployment",
  "packagefamilyname",
  "8wekyb3d8bbwe",
  "store"
];

function looksLikeMsixFailure(errorMessage) {
  const text = String(errorMessage ?? "").toLowerCase();
  return MSIX_FAILURE_KEYWORDS.some((keyword) => text.includes(keyword));
}

module.exports = { looksLikeMsixFailure };
