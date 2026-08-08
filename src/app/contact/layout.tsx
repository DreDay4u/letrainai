import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — LeTrainAI",
  description:
    "Get in touch with LeTrainAI. Tell us about your business and we'll help you find the highest-impact AI opportunity.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
