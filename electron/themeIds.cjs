const allowedThemeIds = new Set([
  "azure",
  "mint",
  "amber",
  "violet",
  "rose",
  "ninja",
  "ice",
  "obsidian",
  "ash"
]);
const defaultThemeId = "azure";

function normalizeThemeId(value) {
  return allowedThemeIds.has(value) ? value : defaultThemeId;
}

module.exports = {
  allowedThemeIds,
  defaultThemeId,
  normalizeThemeId,
};
