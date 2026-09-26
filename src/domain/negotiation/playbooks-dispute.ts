// ---------------------------------------------------------------------------
// NyayaLens AI — negotiation playbooks: dispute-side goals
// escalation · renewal · confidentiality · ip · general
// Deterministic data module. No secrets, no network.
// ---------------------------------------------------------------------------

import type { NegotiationPlaybook } from "./types";

export const DISPUTE_PLAYBOOKS: Readonly<
  Record<"escalation" | "renewal" | "confidentiality" | "ip" | "general", NegotiationPlaybook>
> = {
  escalation: {
    signals: ["escalat", "increase", "hike", "increment", "revise", "cpi", "upward revision"],
    citationsA: ["ica-62", "ica-37"],
    citationsB: ["cpa-2-47", "ica-62"],
    citationsMediator: ["cpa-2-47", "ica-62"],
    partyA: [
      "The 10% annual escalation stays — costs rise and the agreement must keep pace.",
      "We can cap escalation at CPI or 8%, whichever is lower, from year two.",
      "Final position: 5% fixed annual escalation with a renegotiation window at renewal.",
    ],
    partyB: [
      "We ask for escalation capped at CPI or 5%, whichever is lower, with 60 days' advance notice.",
      "A fixed 5% is acceptable if the renewal term opens for full renegotiation.",
      "We accept 5% fixed with the renegotiation window and notice in writing.",
    ],
    concessionsA: ["Escalation basis moved from flat 10% to CPI-capped", "Fixed at 5% with renegotiation window"],
    concessionsB: ["Accepted a fixed rate over CPI linkage", "Agreed to the renewal renegotiation instead of a freeze"],
    gaps: [
      "Gap: double-digit automatic hikes versus inflation-only increases.",
      "Gap narrowed to rate basis and notice.",
      "Convergence on 5% fixed with a renegotiation window at renewal.",
    ],
    suggestions: [
      "Anchor escalation to a published index with a hard ceiling.",
      "Bridge: 5% cap, written notice 60 days ahead, renewal opens renegotiation.",
      "Record: capped escalation, notice, and a genuine renegotiation window (novation under ICA § 62).",
    ],
    targetTopics: ["payment", "renewal"],
    redline: {
      issue: "Price escalation clause",
      proposedText:
        "Any escalation is capped at 5% per annum, notified in writing 60 days in advance, and applies only from the start of an anniversary term. Each renewal opens the full price schedule for renegotiation.",
      rationale:
        "Unilateral, open-ended price changes to consumer detriment are unfair terms (CPA § 2(47)); agreed alterations operate as novation (ICA § 62).",
    },
  },
  renewal: {
    signals: ["renew", "extension", "extend", "rollover", "auto-renew", "lock-in"],
    citationsA: ["ica-37", "ica-25"],
    citationsB: ["ica-62", "ica-25", "tpa-106"],
    citationsMediator: ["ica-62", "tpa-106"],
    partyA: [
      "Auto-renewal for a further full term stays — continuity is the point of this agreement.",
      "We can add a 60-day opt-out window before the renewal date.",
      "Final position: auto-renewal with a 90-day opt-out and refreshed terms each cycle.",
    ],
    partyB: [
      "We ask to delete auto-renewal — renewal should require affirmative written consent.",
      "A 90-day opt-out window is acceptable if renewal terms are shared in advance.",
      "We accept auto-renewal with a 90-day opt-out, provided each renewal renegotiates price and term.",
    ],
    concessionsA: ["Opt-out window introduced", "Renewal terms committed in writing 90 days ahead"],
    concessionsB: ["Accepted auto-renewal with opt-out instead of deletion", "Agreed to a defined renewal term"],
    gaps: [
      "Gap: silent lock-in versus affirmative consent — a full cycle of unwanted term at stake.",
      "Gap narrowed to the opt-out window length and disclosure of renewal terms.",
      "Convergence on auto-renewal with a 90-day opt-out and refreshed terms.",
    ],
    suggestions: [
      "Convert silent lock-in into an opt-out with a real window and advance terms.",
      "Bridge: 90-day opt-out, renewal terms in writing, price open to renegotiation.",
      "Record: opt-out mechanics, diarised notice, and novation of terms each cycle (ICA § 62).",
    ],
    targetTopics: ["renewal"],
    redline: {
      issue: "Auto-renewal / lock-in",
      proposedText:
        "The agreement renews only if neither party opts out in writing at least 90 days before the term ends. Renewal terms, including price, are shared 90 days in advance and open to renegotiation; no renewal is automatic on unchanged one-sided terms.",
      rationale:
        "Continuing obligations need fresh consensus or valid novation (ICA § 62); promises without consideration are void outside statutory exceptions (ICA § 25); lease renewals follow their own formalities (TPA § 106).",
    },
  },
  confidentiality: {
    signals: ["confidential", "nda", "secrecy", "disclose", "non-disclosure", "proprietary information"],
    citationsA: ["ica-37", "sra-injunctions"],
    citationsB: ["sra-injunctions", "ica-73", "bns-316"],
    citationsMediator: ["sra-injunctions", "ica-73"],
    partyA: [
      "Confidentiality stays perpetual and one-way — our information is the crown jewels here.",
      "We can accept mutual obligations with a 5-year tail after termination.",
      "Final position: mutual, 3 years post-termination, with standard carve-outs and injunctive relief preserved.",
    ],
    partyB: [
      "We ask for mutual scope, a 3-year sunset, and carve-outs for public, independently developed, and legally compelled disclosure.",
      "A 5-year tail is acceptable only if the carve-outs and compelled-disclosure notice are added.",
      "We accept mutual, 3 years, full carve-outs, and proportionate remedies instead of automatic injunctions.",
    ],
    concessionsA: ["Obligations made mutual", "Sunset reduced from perpetual to 3 years"],
    concessionsB: ["Accepted injunctive relief for genuine trade secrets", "Agreed to return-or-destroy on termination"],
    gaps: [
      "Gap: perpetual one-way secrecy versus a time-bound mutual regime.",
      "Gap narrowed to the sunset length and carve-out list.",
      "Convergence on mutual, 3-year, carve-outs complete; remedies wording remains.",
    ],
    suggestions: [
      "Make the obligations mutual first — asymmetry is the real fight, not duration.",
      "Bridge: 3-year sunset, four standard carve-outs, notice on compelled disclosure.",
      "Record: mutual scope, sunset, carve-outs, and injunctions only where damages are inadequate.",
    ],
    targetTopics: ["confidentiality"],
    redline: {
      issue: "Confidentiality scope and duration",
      proposedText:
        "Confidentiality obligations are mutual, last 3 years after termination, and exclude information that is public, independently developed, lawfully received from a third party, or compelled by law (with prompt notice). Injunctive relief is available only where monetary compensation is inadequate.",
      rationale:
        "Injunctions lie where damages are not adequate relief (SRA §§ 36–42); breach exposure is bounded by direct loss (ICA § 73); dishonest misuse of entrusted information is penal (BNS § 316).",
    },
  },
  ip: {
    signals: ["intellectual property", "copyright", "invention", "work product", "assignment", " ip ", "moral rights"],
    citationsA: ["ica-10", "ica-37"],
    citationsB: ["ica-10", "sra-injunctions"],
    citationsMediator: ["ica-10", "ica-62"],
    partyA: [
      "All IP created during the engagement vests in us exclusively, including background improvements.",
      "We can carve out your pre-existing background IP with a licence back to us for use in the deliverables.",
      "Final position: foreground IP assigned to us; background IP retained by you with a non-exclusive licence; moral rights waived only to the extent legally possible.",
    ],
    partyB: [
      "We ask to retain background IP entirely and limit assignment to foreground IP actually paid for.",
      "Foreground assignment is acceptable with a background-IP carve-out and a portfolio-use licence for us.",
      "We accept the final structure provided the licence back is non-exclusive, royalty-free, and limited to the deliverables.",
    ],
    concessionsA: ["Background IP carve-out accepted", "Assignment narrowed to paid foreground IP"],
    concessionsB: ["Accepted foreground assignment", "Agreed to a limited licence back"],
    gaps: [
      "Gap: total exclusive vesting versus paid-work-only assignment.",
      "Gap narrowed to the background-IP carve-out and licence scope.",
      "Convergence on foreground/background split with a limited licence back.",
    ],
    suggestions: [
      "Split foreground from background first; everything else follows from that line.",
      "Bridge: assign paid foreground IP, retain background, non-exclusive licence both ways as needed.",
      "Record: the split, the licence scope, and inventors' attribution where applicable.",
    ],
    targetTopics: ["confidentiality", "liability"],
    redline: {
      issue: "IP ownership and licence scope",
      proposedText:
        "IP created specifically under this agreement and paid for (foreground IP) assigns to the commissioning party. Each party retains its pre-existing (background) IP; a non-exclusive, royalty-free licence is granted to use background IP embedded in the deliverables, for the deliverables' purpose only.",
      rationale:
        "Ownership transfers operate through the contract's own terms, which must be lawful and consensual (ICA § 10); scope changes need agreement (ICA § 62); injunctive over-reach is bounded by adequacy of damages (SRA §§ 36–42).",
    },
  },
  general: {
    signals: [],
    citationsA: ["ica-37"],
    citationsB: ["ica-10", "ica-37", "ica-73"],
    citationsMediator: ["ica-10", "ica-73"],
    partyA: [
      "The agreement stands as drafted — every term was priced into the deal.",
      "We can clarify ambiguous wording without changing the commercial balance.",
      "Final position: clarifications documented in a side letter; substantive terms unchanged.",
    ],
    partyB: [
      "We ask for the one-sided terms flagged in the analysis to be rebalanced before signature.",
      "Clarifications must include the cure periods and notice mechanics, not just definitions.",
      "We accept a side letter provided it carries the cure, notice, and refund clarifications.",
    ],
    concessionsA: ["Side-letter clarifications offered", "Cure and notice mechanics accepted into the letter"],
    concessionsB: ["Accepted a side letter instead of a redraft", "Deferred two lower-priority asks to renewal"],
    gaps: [
      "Gap: positions are broad — the specific ask needs sharpening before real trade can start.",
      "Gap narrowed to which clarifications carry contractual force.",
      "Convergence on a binding side letter with the flagged clarifications.",
    ],
    suggestions: [
      "Convert the analysis findings into a short list of concrete asks before round one next time.",
      "Bridge: a side letter that cures ambiguity without reopening priced terms.",
      "Record: the side letter, its precedence clause, and the review date.",
    ],
    targetTopics: ["ambiguity"],
    redline: {
      issue: "Ambiguity and one-sided drafting",
      proposedText:
        "A side letter records the agreed clarifications — cure periods, notice mechanics, refund timelines — and states that it prevails over inconsistent clauses in the main agreement.",
      rationale:
        "Valid contracts require lawful, consensual terms (ICA § 10); ambiguity is construed against the drafter, and clarification now avoids compensation disputes later (ICA § 73).",
    },
  },
};
