import { describe, expect, it } from "vitest";
import { isVirtualDisplayAdapterName, normalizeGpuInfo } from "./hardware";

describe("hardware helpers", () => {
  it("filters virtual display adapters from GPU lists", () => {
    expect(isVirtualDisplayAdapterName("Zako Display Adapter")).toBe(true);
    expect(isVirtualDisplayAdapterName("USB Mobile Monitor Virtual Display")).toBe(true);
    expect(isVirtualDisplayAdapterName("GameViewer Virtual Display Adapter")).toBe(true);
    expect(isVirtualDisplayAdapterName("NVIDIA GeForce RTX 4070 Ti")).toBe(false);
  });

  it("keeps real GPUs and prefers dedicated memory", () => {
    const rows = normalizeGpuInfo([
      { name: "Zako Display Adapter", driverVersion: "1", adapterRamGb: 1 },
      {
        name: "NVIDIA GeForce RTX 4070 Ti",
        driverVersion: "32.0.15.7602",
        adapterRamGb: 4,
        dedicatedMemoryGb: 12,
      },
    ]);

    expect(rows).toEqual([
      {
        name: "NVIDIA GeForce RTX 4070 Ti",
        driverVersion: "32.0.15.7602",
        adapterRamGb: 12,
      },
    ]);
  });
});
