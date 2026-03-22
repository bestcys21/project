import type { MetadataRoute } from "next";
import { BASE_URL } from "./layout";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL,                    lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/dashboard`,     lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/ranking`,       lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/calendar`,      lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/wiki`,          lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
