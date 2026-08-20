import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free AI Assessment — LeTrainAI",
  description:
    "Take our free 3-minute AI assessment. Answer 5 questions and get a personalized report on your highest-ROI AI opportunity.",
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
