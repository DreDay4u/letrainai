import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — LeTrainAI",
  description:
    "Common questions about AI consulting, implementation timelines, pricing, and what it's like to work with LeTrainAI.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
