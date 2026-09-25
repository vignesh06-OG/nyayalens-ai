import { afterEach, describe, expect, it, vi } from "vitest";

import { getContract, saveContract } from "@/lib/contractStore";
import type { Contract } from "@/domain/simulation/types";

const contract = (id: string): Contract => ({
  id,
  title: `Contract ${id}`,
  kind: "rental",
  text: "The tenant shall pay rent on the 5th of each month.",
  provisions: [],
});

afterEach(() => {
  vi.useRealTimers();
});

describe("contractStore", () => {
  it("round-trips a saved contract", () => {
    saveContract(contract("c-1"));
    expect(getContract("c-1")?.title).toBe("Contract c-1");
  });

  it("returns null for unknown ids", () => {
    expect(getContract("does-not-exist")).toBeNull();
  });

  it("persists on globalThis across repeated access", () => {
    saveContract(contract("c-2"));
    const globalStore = (globalThis as Record<string, unknown>)["__nyayalensContractStore"];
    expect(globalStore).toBeDefined();
    expect(getContract("c-2")?.kind).toBe("rental");
  });

  it("expires entries past the TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    saveContract(contract("ttl-1"));
    expect(getContract("ttl-1")).not.toBeNull();
    vi.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    expect(getContract("ttl-1")).toBeNull();
  });

  it("evicts the oldest entries beyond the 200-entry cap", () => {
    for (let i = 0; i < 205; i += 1) {
      saveContract(contract(`bulk-${i}`));
    }
    expect(getContract("bulk-0")).toBeNull();
    expect(getContract("bulk-204")).not.toBeNull();
  });
});
