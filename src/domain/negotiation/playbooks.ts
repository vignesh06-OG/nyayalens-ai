import type { NegotiationGoalKind } from "./types";

/**
 * Engine 06 data tables — one playbook per negotiation goal. Party A argues
 * the drafter/counterparty side, Party B the user's side, the Mediator
 * bridges. Citation ids resolve through the canonical legal DB. Extending the
 * engine with a new goal = adding one entry here (open/closed).
 */

export interface NegotiationPlaybook {
  /** Free-text signals used to detect this goal from the user's ask. */
  signals: readonly string[];
  /** Provision ids each agent grounds on. */
  citationsA: readonly string[];
  citationsB: readonly string[];
  citationsMediator: readonly string[];
  /** Round 1–3 positions. */
  partyA: readonly [string, string, string];
  partyB: readonly [string, string, string];
  /** Round 2–3 concessions. */
  concessionsA: readonly [string, string];
  concessionsB: readonly [string, string];
  /** Round 1–3 mediator gap statements and bridges. */
  gaps: readonly [string, string, string];
  suggestions: readonly [string, string, string];
  /** Clause topics (risk dimensions) the redline hunt targets. */
  targetTopics: readonly string[];
  redline: { issue: string; proposedText: string; rationale: string };
}

export const NEGOTIATION_PLAYBOOKS: Readonly<Record<NegotiationGoalKind, NegotiationPlaybook>> = {
  deposit: {
    signals: ["deposit", "security", "advance", "booking amount", "refundable", "refunded"],
    citationsA: ["ica-37", "ica-74"],
    citationsB: ["rera-13", "cpa-2-47", "ica-73"],
    citationsMediator: ["cpa-2-47", "rera-13"],
    partyA: [
      "The security deposit stays at three months — it is our only protection against damage and unpaid rent.",
      "We can discuss two months, but only with rent auto-debited by the 3rd of each month.",
      "Final position: two months' deposit, refunded within 45 days of vacating against a clean handover.",
    ],
    partyB: [
      "We ask for one month's deposit — anything more is dead money locked for the whole tenancy.",
      "Two months is acceptable only with a 30-day refund deadline and an itemised deduction statement.",
      "We accept two months provided the refund window is 30 days and discretionary forfeiture is struck out.",
    ],
    concessionsA: ["Deposit reduced from three months to two", "Refund undertaking put in writing"],
    concessionsB: ["Accepted two months instead of one", "Agreed to a documented handover checklist"],
    gaps: [
      "Gap: two months of deposit money. Both sides hold legitimate protection and liquidity interests.",
      "Gap narrowed to the refund window — 45 days versus 30.",
      "Convergence on amount achieved; the refund mechanics should close the deal.",
    ],
    suggestions: [
      "Anchor the deposit to one month and trade the second month against a shorter refund window.",
      "Bridge: 30-day refund with itemised deductions; forfeiture only against documented dues.",
      "Record the final terms: two months, 30-day refund, itemised statement, no sole-discretion forfeiture.",
    ],
    targetTopics: ["payment"],
    redline: {
      issue: "Deposit quantum and refund mechanics",
      proposedText:
        "The security deposit shall be one month's rent (two months maximum where agreed in writing), refundable within 30 days of vacating after deduction of documented dues, with an itemised statement. forfeiture at sole discretion is deleted.",
      rationale:
        "Excessive deposits and one-sided forfeiture are presumptively unfair terms against consumers (CPA § 2(47)); property advances above 10% without a registered agreement are capped by RERA § 13 where applicable.",
    },
  },
  notice: {
    signals: ["notice", "notice period", "intimation", "prior written", "days notice"],
    citationsA: ["ica-37"],
    citationsB: ["tpa-106", "ica-39"],
    citationsMediator: ["tpa-106", "ica-39"],
    partyA: [
      "The 90-day notice period stays — replacement and transition take real time.",
      "We could move to 60 days if all outstanding dues are cleared before exit.",
      "Final position: 45 days' written notice with a handover checklist.",
    ],
    partyB: [
      "We ask for 30 days' notice — 90 days is a lock-in in everything but name.",
      "We will help source a replacement to bridge the gap if notice drops to 30 days.",
      "We accept 30 days aligned with statutory notice discipline, delivered by email or registered post.",
    ],
    concessionsA: ["Notice reduced from 90 to 60 days", "Further reduced to 45 with handover checklist"],
    concessionsB: ["Offered replacement-sourcing cooperation", "Accepted a written handover checklist"],
    gaps: [
      "Gap: 60 days of notice. Continuity interests versus mobility interests, both legitimate.",
      "Gap is now 15–30 days; the replacement-tenant bridge is credible.",
      "Convergence at 30 days plus written notice; delivery mode is the last open point.",
    ],
    suggestions: [
      "Trade notice length against a replacement obligation rather than money.",
      "Bridge: 30-day notice, email delivery valid, dues settled at handover.",
      "Record: 30 days' written notice, email valid, statutory notice discipline preserved.",
    ],
    targetTopics: ["termination"],
    redline: {
      issue: "Notice period and delivery",
      proposedText:
        "Either party may terminate on 30 days' written notice, delivered by email or registered post, specifying the effective date. For leases, the statutory notice discipline of TPA § 106 continues to apply.",
      rationale:
        "TPA § 106 sets the default notice framework for leases; locking a party in far beyond it without consideration invites challenge (ICA § 39).",
    },
  },
  termination: {
    signals: ["terminat", "exit", "break", "walk away", "quit", "cancel", "end early"],
    citationsA: ["ica-37", "ica-74"],
    citationsB: ["ica-39", "tpa-106", "cpa-2-47"],
    citationsMediator: ["ica-39", "cpa-2-47"],
    partyA: [
      "Early termination triggers the full balance-term payout — that is the bargain we priced.",
      "We can waive the payout for a documented force-majeure or relocation event only.",
      "Final position: termination allowed with a two-month break fee and 30 days' notice.",
    ],
    partyB: [
      "We ask for termination for convenience on 30 days' notice without a balance payout.",
      "A capped break fee of one month is fair if the termination right is mutual.",
      "We accept a two-month break fee only if cure periods and refund of prepaid amounts are guaranteed.",
    ],
    concessionsA: ["Force-majeure exit carved out of the payout", "Payout reduced to a two-month break fee"],
    concessionsB: ["Accepted a capped break fee", "Agreed to 30 days' written notice"],
    gaps: [
      "Gap: full balance payout versus free exit — the widest possible spread on this clause.",
      "Gap narrowed to fee size and mutuality of the right.",
      "Convergence on a capped, mutual break fee with refund of prepaid amounts.",
    ],
    suggestions: [
      "Convert the balance payout into a capped break fee; keep the right mutual.",
      "Bridge: two-month fee, 30-day notice, pro-rata refund of prepayments.",
      "Record: mutual termination for convenience, capped fee, prepaid amounts refunded pro-rata.",
    ],
    targetTopics: ["termination", "liability"],
    redline: {
      issue: "Early-termination exposure",
      proposedText:
        "Either party may terminate for convenience on 30 days' written notice by paying a break fee capped at two months' charges; prepaid amounts are refunded pro-rata within 30 days. The balance-of-term payout clause is deleted.",
      rationale:
        "Refusal or disabling of performance gives the aggrieved party a statutory exit (ICA § 39); stipulated sums are moderated to reasonable compensation (ICA § 74), and one-sided exit penalties are unfair terms (CPA § 2(47)).",
    },
  },
  penalty: {
    signals: ["penalty", "penalt", "late fee", "fine", "liquidated", "interest on"],
    citationsA: ["ica-74", "ica-37"],
    citationsB: ["ica-74", "cpa-2-47"],
    citationsMediator: ["ica-74", "cpa-2-47"],
    partyA: [
      "The late-payment penalty of 3% per week stays — payment discipline is non-negotiable.",
      "We can move to 18% per annum simple interest with a 7-day grace period.",
      "Final position: 12% per annum after a 10-day cure window, capped at one instalment.",
    ],
    partyB: [
      "3% per week is punitive — we ask for a 15-day grace period and a cap at actual damages.",
      "18% per annum is acceptable only with the grace period and a hard cap.",
      "We accept 12% per annum after a 10-day cure window, capped, with penalties struck for disputed amounts.",
    ],
    concessionsA: ["Weekly penalty converted to annual interest", "Cure window extended to 10 days with a cap"],
    concessionsB: ["Accepted interest instead of a flat waiver", "Agreed to automatic debit for instalments"],
    gaps: [
      "Gap: punitive weekly compounding versus damages-only exposure.",
      "Gap narrowed to rate, grace period, and cap.",
      "Convergence on a capped annual rate with a cure window.",
    ],
    suggestions: [
      "Replace compounding weekly penalties with simple annual interest plus a cure window.",
      "Bridge: 12–18% per annum, 10-day cure, cap at one instalment, disputed amounts excluded.",
      "Record: capped simple interest after cure; penalties do not apply to bona-fide disputes.",
    ],
    targetTopics: ["payment", "liability"],
    redline: {
      issue: "Penalty and late-fee regime",
      proposedText:
        "Late amounts carry simple interest at 12% per annum after a 10-day cure window, capped at one instalment's value. No penalty accrues on amounts disputed in good faith and evidenced in writing.",
      rationale:
        "Courts award reasonable compensation not exceeding the stipulated sum (ICA § 74); disproportionate penalties against consumers are unfair terms (CPA § 2(47)).",
    },
  },
  payment: {
    signals: ["pay", "rent", "salary", "fee", "emi", "instal", "dues", "payment terms"],
    citationsA: ["ica-37", "ica-55"],
    citationsB: ["ica-37", "ica-55", "ica-73"],
    citationsMediator: ["ica-37", "ica-73"],
    partyA: [
      "Payment terms stay as drafted — the 5th-of-month due date with immediate default consequences.",
      "We can add a 5-day grace period if payments move to auto-debit.",
      "Final position: 7-day grace, auto-debit preferred, default interest as per the penalty clause.",
    ],
    partyB: [
      "We ask for a 10-day grace period, a written payment plan option, and disputes to not trigger default.",
      "A 7-day grace with auto-debit is workable if default requires written intimation first.",
      "We accept 7-day grace and auto-debit, provided any default notice gives 15 days to cure.",
    ],
    concessionsA: ["Grace period added", "Written default intimation accepted"],
    concessionsB: ["Accepted auto-debit", "Agreed to the 7-day grace instead of 10"],
    gaps: [
      "Gap: zero-grace immediate default versus a protected cure regime.",
      "Gap narrowed to grace length and default intimation.",
      "Convergence on grace plus written default notice with a cure window.",
    ],
    suggestions: [
      "Trade auto-debit certainty for a grace period and written default notice.",
      "Bridge: 7-day grace, written intimation, 15-day cure before consequences.",
      "Record: grace, auto-debit, written default notice, cure window, disputes excluded.",
    ],
    targetTopics: ["payment"],
    redline: {
      issue: "Payment schedule and default mechanics",
      proposedText:
        "Payments fall due on the 5th with a 7-day grace period. No default arises without written intimation and a further 15 days to cure; amounts disputed in good faith with evidence are excluded from default.",
      rationale:
        "Performance obligations run both ways (ICA § 37); where time is of the essence, failure effects must be proportionate (ICA § 55) and loss compensation stays within direct damages (ICA § 73).",
    },
  },
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
