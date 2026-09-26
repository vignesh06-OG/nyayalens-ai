// ---------------------------------------------------------------------------
// NyayaLens AI — negotiation playbook registry
// Composes the two deterministic playbook datasets into one Record, statically
// checked to cover every NegotiationGoalKind.
//
// Data modules:
//   playbooks-contract.ts — deposit · notice · termination · penalty · payment
//   playbooks-dispute.ts  — escalation · renewal · confidentiality · ip · general
//
// No secrets. No network. Deterministic.
// ---------------------------------------------------------------------------

import { CONTRACT_PLAYBOOKS } from "./playbooks-contract";
import { DISPUTE_PLAYBOOKS } from "./playbooks-dispute";
import type { NegotiationGoalKind, NegotiationPlaybook } from "./types";

export type { NegotiationPlaybook };

export const NEGOTIATION_PLAYBOOKS: Readonly<Record<NegotiationGoalKind, NegotiationPlaybook>> = {
  ...CONTRACT_PLAYBOOKS,
  ...DISPUTE_PLAYBOOKS,
};
