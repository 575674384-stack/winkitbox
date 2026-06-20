export type RawGpuInfo = {
  name: string;
  driverVersion?: string;
  adapterRamGb?: number;
  dedicatedMemoryGb?: number;
};

export type GpuInfo = {
  name: string;
  driverVersion: string;
  adapterRamGb?: number;
};

const virtualGpuPattern =
  /(virtual|usb\s+mobile\s+monitor|zako|gameviewer|indirect\s+display|remote\s+display|basic\s+render|spacedesk|parsec|mirage|citrix|vmware|virtualbox|displaylink)/i;

export function isVirtualDisplayAdapterName(name: string) {
  return virtualGpuPattern.test(name);
}

export function normalizeGpuInfo(value: readonly RawGpuInfo[]): GpuInfo[] {
  const seen = new Set<string>();

  return value
    .map((gpu) => {
      const name = String(gpu.name ?? "").trim();
      if (!name || isVirtualDisplayAdapterName(name)) {
        return undefined;
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        return undefined;
      }
      seen.add(key);

      const adapterRamGb = normalizeGpuMemory(
        gpu.dedicatedMemoryGb ?? gpu.adapterRamGb,
      );

      return {
        name,
        driverVersion: String(gpu.driverVersion ?? "").trim(),
        ...(adapterRamGb !== undefined ? { adapterRamGb } : {}),
      };
    })
    .filter((gpu): gpu is GpuInfo => Boolean(gpu));
}

function normalizeGpuMemory(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed * 10) / 10;
}
