import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "default" | "narrow";
}

export function Section({
  children,
  className,
  maxWidth = "default",
}: SectionProps) {
  return (
    <section className={cn("px-6 py-16 sm:py-24", className)}>
      <div
        className={cn(
          "mx-auto w-full",
          maxWidth === "default" ? "max-w-6xl" : "max-w-3xl"
        )}
      >
        {children}
      </div>
    </section>
  );
}
