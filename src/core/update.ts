export type UpdateReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type UpdateInfo = {
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  hasUpdate: boolean;
  assets: UpdateReleaseAsset[];
  error?: string;
};

export function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "");
}

export function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersion(left).split(".").map(toVersionNumber);
  const rightParts = normalizeVersion(right).split(".").map(toVersionNumber);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index++) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

export function isUpdateAvailable(currentVersion: string, latestVersion: string) {
  return compareVersions(latestVersion, currentVersion) > 0;
}

function toVersionNumber(value: string) {
  const parsed = Number.parseInt(value.replace(/\D.*/, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
