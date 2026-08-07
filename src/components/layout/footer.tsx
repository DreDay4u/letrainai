import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {year} LeTrainAI. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="mailto:hello@letrainai.com"
            className="text-sm text-muted-foreground transition-colors hover:text-ink"
          >
            hello@letrainai.com
          </Link>
          <Link
            href="https://linkedin.com"
            className="text-sm text-muted-foreground transition-colors hover:text-ink"
          >
            LinkedIn
          </Link>
          <Link
            href="https://x.com"
            className="text-sm text-muted-foreground transition-colors hover:text-ink"
          >
            X
          </Link>
        </div>
      </div>
    </footer>
  );
}
