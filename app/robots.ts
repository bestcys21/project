import type { MetadataRoute } from "next";
import { BASE_URL } from "./layout";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/landing"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
