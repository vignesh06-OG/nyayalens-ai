/**
 * Canonical Indian statute database — single source of truth for every statutory
 * citation (prompts, negotiation grounding, scenario law refs, alignment evidence).
 * Pure data + pure lookups; dependents point inward. Section numbers verified
 * against enacted texts: BNS § 318 = cheating (IPC 415/417/420); § 316 = criminal
 * breach of trust (IPC 405–409 incl. 406).
 */
export interface StatuteProvision {
  /** Stable lookup key, e.g. "ica-73". */
  id: string;
  /** Short act code used in LawReference payloads: "ICA", "BNS", "TPA", ... */
  act: string;
  /** Full statute name with year. */
  statute: string;
  /** Section marker, e.g. "§ 73" or "§ 2(47)". */
  section: string;
  /** Provision heading. */
  title: string;
  /** Predecessor provision(s) under repealed law; null when none. */
  replaces: string | null;
  /** Plain-language essence — safe to surface in prompts and UI. */
  summary: string;
  /** Risk topics this provision anchors (payment, termination, deposit, ...). */
  topics: readonly string[];
}

export const INDIAN_PROVISIONS: readonly StatuteProvision[] = [
  {
    id: "bns-318",
    act: "BNS",
    statute: "Bharatiya Nyaya Sanhita 2023",
    section: "§ 318",
    title: "Cheating",
    replaces: "IPC 415/417/420",
    summary:
      "Deception that dishonestly induces a person to deliver property, or to do or omit something they would not otherwise do. Consolidates the former IPC cheating offences.",
    topics: ["fraud", "dispute", "liability"],
  },
  {
    id: "bns-316",
    act: "BNS",
    statute: "Bharatiya Nyaya Sanhita 2023",
    section: "§ 316",
    title: "Criminal breach of trust",
    replaces: "IPC 405–409 (incl. 406)",
    summary:
      "Dishonest misappropriation or conversion of property entrusted to a person, or dishonest use in violation of a legal direction. Punishment enhanced to up to five years versus the former IPC 406.",
    topics: ["fraud", "liability", "payment"],
  },
  {
    id: "ica-10",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 10",
    title: "What agreements are contracts",
    replaces: null,
    summary:
      "An agreement is a contract only when made with free consent by parties competent to contract, for lawful consideration and with a lawful object — the validity baseline for every document analysed here.",
    topics: ["validity", "consent", "general"],
  },
  {
    id: "ica-23",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 23",
    title: "What considerations and objects are lawful",
    replaces: null,
    summary:
      "Consideration or object is unlawful when forbidden by law, fraudulent, injurious to another, or opposed to public policy — such agreements are void.",
    topics: ["validity", "general"],
  },
  {
    id: "ica-25",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 25",
    title: "Agreements without consideration",
    replaces: null,
    summary:
      "An agreement without consideration is void (nudum pactum) except for the narrow statutory exceptions — relevant when renewals or side promises lack fresh consideration.",
    topics: ["renewal", "validity"],
  },
  {
    id: "ica-37",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 37",
    title: "Obligation of parties to perform contracts",
    replaces: null,
    summary:
      "Parties must perform or offer to perform their respective promises unless excused under the Act — the source of every contractual duty the engine extracts.",
    topics: ["breach", "payment", "general"],
  },
  {
    id: "ica-39",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 39",
    title: "Effect of refusal of performance",
    replaces: null,
    summary:
      "When a party refuses or disables themselves from performing, the promisee may put an end to the contract (unless they acquiesce) — the statutory exit on anticipatory breach.",
    topics: ["termination", "breach"],
  },
  {
    id: "ica-55",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 55",
    title: "Time of the essence — failure to perform at the fixed time",
    replaces: null,
    summary:
      "Where time is essential, failure to perform at the stipulated time makes the contract voidable at the promisee's option, who may also claim compensation for loss occasioned by non-performance.",
    topics: ["payment", "breach", "deadline"],
  },
  {
    id: "ica-56",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 56",
    title: "Agreement to do an impossible act (frustration)",
    replaces: null,
    summary:
      "An agreement to do an act impossible in itself is void; a contract to do an act that becomes impossible or unlawful after formation becomes void (doctrine of frustration).",
    topics: ["general", "force-majeure"],
  },
  {
    id: "ica-62",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 62",
    title: "Effect of novation, rescission and alteration",
    replaces: null,
    summary:
      "If the parties substitute a new contract, rescind, or alter the original, the original need not be performed — the statutory basis for amendment and renegotiation.",
    topics: ["termination", "renewal", "amendment"],
  },
  {
    id: "ica-73",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 73",
    title: "Compensation for loss or damage caused by breach",
    replaces: null,
    summary:
      "A party injured by breach is entitled to compensation for direct loss or damage that naturally arose or was contemplated; remote and indirect loss is excluded.",
    topics: ["breach", "liability", "damages"],
  },
  {
    id: "ica-74",
    act: "ICA",
    statute: "Indian Contract Act 1872",
    section: "§ 74",
    title: "Compensation where a stipulated sum is named (penalties)",
    replaces: null,
    summary:
      "When a contract stipulates a sum for breach (or a penalty), the aggrieved party is entitled to reasonable compensation not exceeding that sum — courts moderate penalty clauses.",
    topics: ["breach", "payment", "penalty"],
  },
  {
    id: "cpa-2-47",
    act: "CPA",
    statute: "Consumer Protection Act 2019",
    section: "§ 2(47)",
    title: "Unfair contract terms",
    replaces: null,
    summary:
      "Defines unfair contract terms as those causing significant detriment to consumers — excessive deposits or security, penalties for breach, unilateral termination, transfer of liability. Consumer commissions may strike them down.",
    topics: ["unfair-terms", "deposit", "consumer", "termination"],
  },
  {
    id: "rera-13",
    act: "RERA",
    statute: "Real Estate (Regulation and Development) Act 2016",
    section: "§ 13",
    title: "Cap on advance without a registered agreement",
    replaces: null,
    summary:
      "A promoter may not accept more than 10% of the cost of an apartment, plot or building as advance or application money without first entering into a registered agreement for sale.",
    topics: ["deposit", "advance", "payment", "real-estate"],
  },
  {
    id: "ita-10a",
    act: "ITA",
    statute: "Information Technology Act 2000",
    section: "§ 10A",
    title: "Validity of contracts formed electronically",
    replaces: null,
    summary:
      "Contracts formed through electronic communication and electronic records are valid and enforceable; no contract may be denied effect solely because it was concluded electronically.",
    topics: ["e-contract", "validity", "general"],
  },
  {
    id: "tpa-105",
    act: "TPA",
    statute: "Transfer of Property Act 1882",
    section: "§ 105",
    title: "Lease defined",
    replaces: null,
    summary:
      "A lease of immovable property is a transfer of a right to enjoy that property for a certain time (express, implied, or perpetual) in consideration of rent or other valuable consideration.",
    topics: ["lease", "rental", "validity"],
  },
  {
    id: "tpa-106",
    act: "TPA",
    statute: "Transfer of Property Act 1882",
    section: "§ 106",
    title: "Duration and termination notice for leases",
    replaces: null,
    summary:
      "Absent contract or local law, agricultural/manufacturing leases need six months' notice and other leases fifteen days' notice expiring with the end of a month; notice must be in writing.",
    topics: ["termination", "notice", "rental", "lease"],
  },
  {
    id: "tpa-108",
    act: "TPA",
    statute: "Transfer of Property Act 1882",
    section: "§ 108",
    title: "Rights and liabilities of lessor and lessee",
    replaces: null,
    summary:
      "Default duties of both sides of a lease — disclosure of material defects, quiet enjoyment, payment of rent, proper care of the property, and the right to avoid the lease on lessor default.",
    topics: ["lease", "rental", "termination"],
  },
  {
    id: "sra-injunctions",
    act: "SRA",
    statute: "Specific Relief Act 1963",
    section: "§§ 36–42",
    title: "Injunctions (preventive relief)",
    replaces: null,
    summary:
      "Courts may grant temporary and perpetual injunctions to prevent breach of an obligation or injury where compensation in money would not afford adequate relief.",
    topics: ["dispute", "remedy", "liability"],
  },
];
