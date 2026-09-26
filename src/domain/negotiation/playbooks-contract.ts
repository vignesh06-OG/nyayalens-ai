// ---------------------------------------------------------------------------
// NyayaLens AI — negotiation playbooks: contract-side goals
// deposit · notice · termination · penalty · payment
// Deterministic data module. No secrets, no network.
// ---------------------------------------------------------------------------

import type { NegotiationPlaybook } from "./types";

export const CONTRACT_PLAYBOOKS: Readonly<
  Record<"deposit" | "notice" | "termination" | "penalty" | "payment", NegotiationPlaybook>
> = {
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
};
