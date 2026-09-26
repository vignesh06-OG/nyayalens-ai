/** @type {import('next').NextConfig} */

// CSP rationale (see SECURITY.md):
// - Production never allows 'unsafe-eval'. Development keeps it because the
//   webpack HMR runtime evaluates generated module code.
// - 'unsafe-inline' for script-src stays: the Next.js App Router inlines
//   flight-data bootstrap scripts and this app does not run nonce middleware.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // --- Production efficiency (surgical repair; security headers below untouched) ---
  // No browser source maps in production: smaller artifacts, no source disclosure.
  productionBrowserSourceMaps: false,
  // SWC minification (explicit).
  swcMinify: true,
  // Strip console.* from production builds EXCEPT console.error — the API
  // routes log failures deliberately and those lines must survive.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  // Sub-path tree-shaking for barrel-style packages (lucide/framer ship huge
  // index modules; this imports only the icons/components actually used).
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "clsx", "tailwind-merge"],
  },
  // Compress server responses.
  compress: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.openai.com;`,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
