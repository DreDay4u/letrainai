import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeTrainAI — AI Consulting",
    short_name: "LeTrainAI",
    description:
      "AI consulting for businesses that take AI seriously. Automation, AI-enhanced websites, and workflow optimization.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F3",
    theme_color: "#1B4332",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
