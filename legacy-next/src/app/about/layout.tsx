import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — LeTrainAI",
  description:
    "LeTrainAI was founded to bring enterprise-grade AI capability to small and mid-size businesses — without the enterprise price tag or timeline.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
