import type { MetadataRoute } from "next";

const BASE = "https://nyayalens-ai-self.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/quality`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/architecture`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/challenge-alignment`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];
}
