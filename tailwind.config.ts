import type { Config } from "tailwindcss";

// tailwindcss-animate ships without bundled type declarations; require() keeps
// this config strictly typechecked without vendoring an ambient module.
const tailwindcssAnimate = require("tailwindcss-animate");

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        "serif-accent": [
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Georgia",
          "serif",
        ],
      },
      boxShadow: {
        "neon-blue":
          "0 0 0 1px rgba(147, 197, 253, 0.35) inset, 0 12px 40px -12px rgba(59, 130, 246, 0.55), 0 0 48px -16px rgba(59, 130, 246, 0.45)",
        "neon-blue-hover":
          "0 0 0 1px rgba(191, 219, 254, 0.55) inset, 0 16px 52px -12px rgba(59, 130, 246, 0.75), 0 0 72px -12px rgba(59, 130, 246, 0.6)",
        "neon-amber":
          "0 0 0 1px rgba(252, 211, 77, 0.3) inset, 0 12px 40px -16px rgba(245, 158, 11, 0.5), 0 0 48px -18px rgba(245, 158, 11, 0.4)",
        "neon-emerald":
          "0 0 0 1px rgba(110, 231, 183, 0.3) inset, 0 12px 40px -16px rgba(16, 185, 129, 0.5), 0 0 48px -18px rgba(16, 185, 129, 0.4)",
        "neon-rose":
          "0 0 0 1px rgba(251, 207, 232, 0.3) inset, 0 12px 40px -16px rgba(244, 63, 94, 0.5), 0 0 48px -18px rgba(244, 63, 94, 0.4)",
      },
      keyframes: {
        "mesh-a": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(6%, -8%, 0) scale(1.12)" },
        },
        "mesh-b": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.05)" },
          "50%": { transform: "translate3d(-8%, 5%, 0) scale(0.95)" },
        },
        "mesh-c": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(0.95)" },
          "50%": { transform: "translate3d(5%, 8%, 0) scale(1.15)" },
        },
        "mesh-d": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-6%, -5%, 0) scale(1.08)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.7", filter: "brightness(1.3)" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-16px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        rise: {
          from: { opacity: "0", transform: "translate3d(0, 24px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "scroll-hint": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.55" },
          "50%": { transform: "translateY(10px)", opacity: "1" },
        },
      },
      animation: {
        "mesh-a": "mesh-a 28s ease-in-out infinite",
        "mesh-b": "mesh-b 36s ease-in-out infinite",
        "mesh-c": "mesh-c 42s ease-in-out infinite",
        "mesh-d": "mesh-d 34s ease-in-out infinite",
        marquee: "marquee 45s linear infinite",
        "glow-pulse": "glow-pulse 3.2s ease-in-out infinite",
        "float-y": "float-y 7s ease-in-out infinite",
        "spin-slow": "spin-slow 48s linear infinite",
        rise: "rise 0.85s cubic-bezier(0.21, 0.65, 0.32, 0.9) both",
        "scroll-hint": "scroll-hint 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
