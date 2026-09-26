import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { SmoothScroll, ToasterHost } from "@/components/ui/SmoothScroll";

import "./globals.css";


const navigation = [
  { href: "/#features", label: "Instruments" },
  { href: "/quality", label: "Quality" },
  { href: "/architecture", label: "Architecture" },
  { href: "/challenge-alignment", label: "Challenge" },
] as const;

export const metadata: Metadata = {
  title: "NyayaLens AI — GenAI Legal Intelligence Platform",
  description:
    "AI-powered legal assistance: simplify documents, compare contracts, simulate scenarios, and generate action kits. Powered by GenAI with Indian law awareness.",
  keywords: "legal AI, contract analysis, legal assistance, GenAI, legal document simplification, AI for legal",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

/** Small aperture mark — the same motif as the hero lens. */
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6.5" fill="rgba(59,130,246,0.35)" stroke="#93c5fd" strokeWidth="1.5" />
      <path d="M16 2v5M16 25v5M2 16h5M25 16h5" stroke="rgba(248,250,252,0.55)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-300 antialiased">
        <SmoothScroll />
        <ToasterHost />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              <BrandMark />
              <span className="flex items-baseline gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-100">
                  NyayaLens
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-400">
                  AI
                </span>
              </span>
            </Link>
            <ul className="flex items-center gap-1 sm:gap-2">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm tracking-tight text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main id="main">{children}</main>

        <footer className="border-t border-white/5">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-200">
                  NyayaLens AI
                </p>
                <p className="text-xs text-slate-400">
                  GenAI legal intelligence for real people
                </p>
              </div>
            </div>
            <ul className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-slate-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="mx-auto w-full max-w-7xl border-t border-white/5 px-6 pb-8 pt-6 text-xs leading-relaxed text-slate-400">
            NyayaLens AI provides informational assistance, not legal advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
