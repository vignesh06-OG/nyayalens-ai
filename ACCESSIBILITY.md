# NyayaLens AI — Accessibility (WCAG AA)

- **Contrast** — slate-50/200/300 text on slate-950 and glass surfaces meets WCAG AA; accent colours used for text only at AA-safe weights.
- **Keyboard** — every control reachable and operable: Tabs use the ARIA tab pattern with roving tabindex + Arrow/Home/End; Dialog traps focus, closes on ESC, restores focus on close; chips, copy buttons, meters, sliders are real `<button>`/`<input>` elements.
- **ARIA** — `role="alert"` error blocks with Retry buttons; `role="meter"` risk gauges/heatmap bars with valuenow/min/max; aria-labels on all icon-only and card-flipping controls; `aria-live="polite"` on streaming feeds; tablist/tab/tabpanel wiring throughout.
- **Structure** — landmark `<main>`/`<section>` elements with heading hierarchy; visible focus styles; skip-target section ids (`#analyze` … `#compare`).
- **Loading & empty states** — shimmering skeleton loaders (never spinners); empty states always carry a helpful sentence + next step, never blank panels.
- **Motion** — `prefers-reduced-motion: reduce` disables every animation and transition globally (mesh, marquee, spotlight, tilt, glows, reveals, streaming carets).
- **Media** — zero external fonts or images; all icons are inline SVG (lucide) marked `aria-hidden` when decorative.

Audit command: `npm run quality` (lint + strict type-check + tests + build).
