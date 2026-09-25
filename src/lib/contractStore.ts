import type { Contract } from "@/domain/simulation/types";

/**
 * Tiny in-memory contract registry backing `SimulateInputSchema.contractId`.
 * /api/analyze stores the parsed contract here; /api/simulate reads it.
 *
 * State lives on globalThis because Next.js compiles each route with its own
 * module graph — module-level `Map`s are NOT shared across routes in dev.
 */

interface StoreEntry {
  contract: Contract;
  storedAt: number;
}

const TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 200;

type GlobalWithStore = typeof globalThis & {
  __nyayalensContractStore?: Map<string, StoreEntry>;
};

const store: Map<string, StoreEntry> =
  (globalThis as GlobalWithStore).__nyayalensContractStore ??= new Map<string, StoreEntry>();

function prune(now: number): void {
  for (const [id, entry] of store) {
    if (now - entry.storedAt > TTL_MS) {
      store.delete(id);
    }
  }
  while (store.size > MAX_ENTRIES) {
    const oldestId = store.keys().next().value;
    if (oldestId === undefined) {
      break;
    }
    store.delete(oldestId);
  }
}

export function saveContract(contract: Contract): void {
  const now = Date.now();
  prune(now);
  store.set(contract.id, { contract, storedAt: now });
}

export function getContract(id: string): Contract | null {
  prune(Date.now());
  return store.get(id)?.contract ?? null;
}
