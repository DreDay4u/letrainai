import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/keystatic/"],
    },
    sitemap: "https://letrainai.com/sitemap.xml",
  };
}
