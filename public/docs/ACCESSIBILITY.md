# NyayaLens AI — Accessibility (WCAG AA mechanisms)

Every claim below is implemented in code and grep-verifiable; what has *not* been formally audited is stated at the end.

- **Skip link & landmarks** — a real “Skip to content” link is the first focusable element (`src/app/layout.tsx`); semantic `<main>`/`<section>` landmarks with heading hierarchy; workbench sections carry stable ids (`#analyze`, `#simulate`, `#compare`, `#negotiate`) that hero CTAs target.
- **Keyboard** — every control reachable and operable: Tabs implement the ARIA tabs pattern with roving `tabindex` and Arrow/Home/End keys (`src/components/ui/Tabs.tsx`); the Dialog is `role="dialog"` + `aria-modal`, traps focus (first/last cycling), closes on Escape and backdrop click, and restores focus to the opener (`src/components/ui/Dialog.tsx`); chips, copy buttons, meters, sliders, and the redline download are real `<button>`/`<input>`/`<a>` elements.
- **ARIA** — `role="alert"` error blocks with Retry buttons; `role="status"` and `aria-live="polite"` on streaming feeds and negotiation progress (screen readers announce rounds/verdict as they stream); `role="meter"` with `aria-valuenow/min/max` on risk gauges and convergence meters; `role="progressbar"` on uploads; 34 explicit `aria-label`s on icon-only and card-flipping controls; full tablist/tab/tabpanel wiring.
- **Colour is never the only channel** — risk and convergence meters print their numeric value next to the bar; stance badges (aggressive/firm/conciliatory/settled) carry text labels, not just colour tones; diffs pair colour with “added/removed/modified” wording.
- **Contrast** — slate-50/200/300 text on slate-950 and glass surfaces meets WCAG AA; accent colours used for text only at AA-safe weights.
- **Motion** — `prefers-reduced-motion: reduce` disables every animation and transition globally (`src/app/globals.css`), and the Framer Motion `Reveal` wrapper checks `matchMedia` before animating (mesh, marquee, spotlight, tilt, glows, reveals, streaming carets).
- **Loading & empty states** — shimmering skeleton loaders (never bare spinners); empty states always carry a helpful sentence plus a next step, never blank panels.
- **Media** — zero external fonts or images; all icons are inline SVG (lucide), `aria-hidden` when decorative.

## Audit status (honest)

Mechanisms above are verified by code inspection, the strict TypeScript build, and unit tests (marker/ARIA contracts). **Not** performed in the build sandbox: automated axe/Lighthouse accessibility runs and a manual screen-reader pass with NVDA/VoiceOver. These are listed as NOT VERIFIED in [EVALUATION.md](EVALUATION.md) rather than claimed. Reproduce the code-level checks with `npm run quality`.
