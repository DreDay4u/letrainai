"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics/client";

/* ------------------------------------------------------------------ */
/* Question data                                                       */
/* ------------------------------------------------------------------ */

const INDUSTRIES = [
  "Retail/E-commerce",
  "Professional Services",
  "Healthcare",
  "Construction",
  "Hospitality",
  "Manufacturing",
  "Real Estate",
  "Financial Services",
  "Education",
  "Other",
] as const;

const COMPANY_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"] as const;

const TIME_SINKS = [
  { value: "data_entry", label: "Data entry" },
  { value: "customer_support", label: "Customer support" },
  { value: "reporting", label: "Reporting" },
  { value: "scheduling", label: "Scheduling" },
  { value: "documents", label: "Document processing" },
  { value: "other", label: "Other" },
] as const;

const CURRENT_TOOLS = [
  { value: "email", label: "Email" },
  { value: "spreadsheets", label: "Spreadsheets (Excel/Sheets)" },
  { value: "crm", label: "CRM" },
  { value: "accounting", label: "QuickBooks/Accounting" },
  { value: "project_management", label: "Project management" },
  { value: "calendar", label: "Calendar/scheduling" },
  { value: "social_media", label: "Social media" },
  { value: "none", label: "None of these" },
] as const;

const BIGGEST_CHALLENGES = [
  { value: "efficiency", label: "Efficiency — getting things done faster" },
  { value: "cost", label: "Cost — reducing expenses" },
  { value: "growth", label: "Growth — scaling up" },
  {
    value: "customer_experience",
    label: "Customer experience — keeping clients happy",
  },
  { value: "compliance", label: "Compliance — staying compliant" },
] as const;

const ANXIETY_REDUCERS = [
  "No technical knowledge required",
  "No signup to start — see your results first",
  "Takes 3 minutes. Your data stays private.",
] as const;

const TOTAL_QUESTIONS = 5;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AssessmentAnswers {
  industry: string;
  company_size: string;
  time_sinks: string[];
  current_tools: string[];
  biggest_challenge: string;
}

interface Recommendation {
  title: string;
  description: string;
  difficulty: "low" | "medium" | "high";
  impact: "moderate" | "significant" | "transformative";
  estimated_time_saved: string;
}

/** Free-tier projection returned by POST /api/assessment (see lib/assessment/report.ts). */
interface AssessmentResult {
  opportunity_score: number;
  estimated_savings: string;
  recommendations: Recommendation[];
  locked_count: number;
  locked_sections: string[];
  disclaimer: string;
}

type Tier = "report" | "session";

type Status = "form" | "submitting" | "results" | "error";

const DIFFICULTY_STYLES: Record<Recommendation["difficulty"], string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const IMPACT_LABELS: Record<Recommendation["impact"], string> = {
  moderate: "Moderate impact",
  significant: "Significant impact",
  transformative: "Transformative impact",
};

const initialAnswers: AssessmentAnswers = {
  industry: "",
  company_size: "",
  time_sinks: [],
  current_tools: [],
  biggest_challenge: "",
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AssessmentWizard() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<AssessmentAnswers>(initialAnswers);
  const [sessionId, setSessionId] = useState<string>("");
  const [status, setStatus] = useState<Status>("form");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [stepError, setStepError] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "submitting" | "done">(
    "idle"
  );
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [emailStepError, setEmailStepError] = useState("");
  const [checkoutPending, setCheckoutPending] = useState<Tier | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const id = crypto.randomUUID();
    setSessionId(id);
    track("assessment_start", { sessionId: id });
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return answers.industry !== "";
      case 1.5:
        return true; // email step always continuable (skip is safe)
      case 2:
        return answers.company_size !== "";
      case 3:
        return answers.time_sinks.length > 0;
      case 4:
        return answers.current_tools.length > 0;
      case 5:
        return answers.biggest_challenge !== "";
      default:
        return false;
    }
  }, [step, answers]);

  const next = () => {
    if (!canContinue) {
      setStepError("Please make a selection to continue.");
      return;
    }
    setStepError("");
    setStep((s) => {
      // Explicit transitions — fractional email step must never ride +1 math.
      if (s === 1) return emailCaptured ? 2 : 1.5;
      if (s === 1.5) return 2;
      return Math.min(s + 1, TOTAL_QUESTIONS);
    });
  };

  const back = () => {
    setStepError("");
    setStep((s) => {
      if (s === 1.5) return 1;
      if (s === 2) return emailCaptured ? 1 : 1.5;
      return Math.max(s - 1, 1);
    });
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    setApiError("");
    track("assessment_submit", { sessionId });
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          answers,
          turnstile_token: "",
        }),
      });

      if (res.status === 429) {
        setApiError(
          "You've reached the assessment limit. Try again in an hour."
        );
        setStatus("error");
        track("assessment_failed", { sessionId });
        return;
      }

      if (!res.ok) {
        setApiError("Something went wrong generating your report. Please try again.");
        setStatus("error");
        track("assessment_failed", { sessionId });
        return;
      }

      const data: AssessmentResult = await res.json();
      setResult(data);
      setStatus("results");
      track("assessment_generated", { sessionId });
    } catch {
      setApiError("Something went wrong generating your report. Please try again.");
      setStatus("error");
      track("assessment_failed", { sessionId });
    }
  };

  // Paid tier checkout: create a Stripe Checkout Session for this assessment
  // and hand off to Stripe's hosted page. The full report renders on
  // /report/[session_id] after verified payment.
  const handleCheckout = async (tier: Tier) => {
    setCheckoutError("");
    setCheckoutPending(tier);
    track("checkout_start", { sessionId, tier });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setCheckoutError(
          data.error ?? "Checkout is temporarily unavailable. Please try again."
        );
        setCheckoutPending(null);
        track("checkout_failed", { sessionId, tier });
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Checkout is temporarily unavailable. Please try again.");
      setCheckoutPending(null);
      track("checkout_failed", { sessionId, tier });
    }
  };

  // Capture-at-start (growth Plan A stage 1): persist the email after Q1 so
  // abandoners after this point remain reachable. Best-effort: a capture
  // failure never blocks the wizard; the completion path re-persists email.
  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailStepError("Please enter a valid email address.");
      return;
    }
    setEmailStepError("");
    setEmailStatus("submitting");
    track("email_capture_submit", { sessionId });
    try {
      const res = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, email: trimmed }),
      });
      if (!res.ok) {
        console.error("[assessment] start capture failed:", res.status);
      }
    } catch {
      console.error("[assessment] start capture network error");
    }
    setEmailStatus("done");
    setEmailCaptured(true);
    track("email_captured_start", { sessionId });
    setStep(2); // explicit: email step (1.5) always advances to question 2
  };

  return (
    <main className="bg-canvas text-body">
      {/* Header */}
      <div className="px-6 py-16 sm:py-24 pb-10 sm:pb-14 pt-24 sm:pt-32"><div className="mx-auto w-full max-w-3xl">
        <div className="border-b border-hairline pb-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Free AI Assessment
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-[1.05] max-w-2xl">
            Discover Your Business&apos;s AI Opportunity in 3 Minutes
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl">
            Get a personalized report showing exactly which processes to
            automate, what it&apos;ll cost, and what you&apos;ll save.
          </p>
        </div>

        {/* Anxiety reducers — prominent, before the form */}
        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ANXIETY_REDUCERS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-lg border border-hairline bg-surface px-4 py-3"
            >
              <span className="font-mono text-accent text-sm shrink-0">✓</span>
              <span className="text-sm text-body leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div></div>

      {/* Form / loading / results */}
      <div className="px-6 py-16 sm:py-24 pt-0 pb-24"><div className="mx-auto w-full max-w-3xl">
        {status === "form" && (
          <StepForm
            step={step}
            answers={answers}
            setAnswers={setAnswers}
            canContinue={canContinue}
            stepError={stepError}
            email={email}
            setEmail={setEmail}
            emailStepError={emailStepError}
            emailStatus={emailStatus}
            onNext={next}
            onBack={back}
            onSubmit={handleSubmit}
            onEmailCapture={handleEmailCapture}
          />
        )}

        {status === "submitting" && <AnalyzingState />}

        {status === "error" && (
          <div className="rounded-lg border border-hairline bg-surface p-8 text-center">
            <p className="font-serif text-2xl text-ink mb-3">
              We couldn&apos;t generate your report
            </p>
            <p className="text-sm text-muted mb-6">{apiError}</p>
            <button
              type="button"
              onClick={() => setStatus("form")}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              ← Back to the questions
            </button>
          </div>
        )}

        {status === "results" && result && (
          <ResultsView
            result={result}
            sessionId={sessionId}
            onCheckout={handleCheckout}
            checkoutPending={checkoutPending}
            checkoutError={checkoutError}
          />
        )}
      </div></div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Step form                                                           */
/* ------------------------------------------------------------------ */

function StepForm({
  step,
  answers,
  setAnswers,
  canContinue,
  stepError,
  email,
  setEmail,
  emailStepError,
  emailStatus,
  onNext,
  onBack,
  onSubmit,
  onEmailCapture,
}: {
  step: number;
  answers: AssessmentAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<AssessmentAnswers>>;
  canContinue: boolean;
  stepError: string;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  emailStepError: string;
  emailStatus: "idle" | "submitting" | "done";
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onEmailCapture: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1.5) {
          onEmailCapture(e);
          return;
        }
        if (step < TOTAL_QUESTIONS) onNext();
        else onSubmit();
      }}
      className="border border-hairline rounded-lg bg-surface p-6 sm:p-10"
      noValidate
    >
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {step === 1.5
              ? "One quick step"
              : `Question ${step} of ${TOTAL_QUESTIONS}`}
          </p>
          <p className="font-mono text-xs text-muted">
            {Math.round((step / TOTAL_QUESTIONS) * 100)}% complete
          </p>
        </div>
        <div
          className="h-1 w-full rounded-full bg-hairline overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(step / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      {step === 1 && (
        <QuestionField
          title="What does your business do?"
          subtitle="Pick the closest match — we'll tailor your recommendations to it."
        >
          <select
            value={answers.industry}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, industry: e.target.value }))
            }
            autoFocus
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3.5 font-sans text-base text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </QuestionField>
      )}

      {step === 1.5 && (
        <QuestionField
          title="Save your results — get next steps"
          subtitle="Enter your email and we'll keep your assessment on file, then reach out with next steps when you're ready. No spam — and skipping changes nothing."
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
              className="w-full sm:flex-1 rounded-lg border border-hairline bg-canvas px-4 py-3.5 font-sans text-base text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
            <button
              type="submit"
              disabled={emailStatus === "submitting"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {emailStatus === "submitting" ? "Saving..." : "Continue →"}
            </button>
          </div>
          {emailStepError && (
            <p className="mt-4 text-sm text-accent" role="alert">
              {emailStepError}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="mt-4 font-sans text-sm text-muted hover:text-ink transition-colors"
          >
            Skip — just show my results
          </button>
        </QuestionField>
      )}

      {step === 2 && (
        <QuestionField
          title="How many people are on your team?"
          subtitle="This helps us estimate the size of your automation opportunity."
        >
          <RadioGroup
            name="company_size"
            options={COMPANY_SIZES.map((size) => ({ value: size, label: size }))}
            value={answers.company_size}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, company_size: value }))
            }
          />
        </QuestionField>
      )}

      {step === 3 && (
        <QuestionField
          title="Which tasks eat the most time?"
          subtitle="Select all that apply."
        >
          <CheckboxGroup
            name="time_sinks"
            options={TIME_SINKS}
            selected={answers.time_sinks}
            onChange={(values) =>
              setAnswers((prev) => ({ ...prev, time_sinks: values }))
            }
          />
        </QuestionField>
      )}

      {step === 4 && (
        <QuestionField
          title="What tools do you currently use?"
          subtitle="Select all that apply. There are no wrong answers."
        >
          <CheckboxGroup
            name="current_tools"
            options={CURRENT_TOOLS}
            selected={answers.current_tools}
            onChange={(values) =>
              setAnswers((prev) => ({ ...prev, current_tools: values }))
            }
          />
        </QuestionField>
      )}

      {step === 5 && (
        <QuestionField
          title="What's your biggest operational challenge?"
          subtitle="This shapes the priorities in your report."
        >
          <RadioGroup
            name="biggest_challenge"
            options={BIGGEST_CHALLENGES}
            value={answers.biggest_challenge}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, biggest_challenge: value }))
            }
          />
        </QuestionField>
      )}

      {stepError && (
        <p className="mt-5 text-sm text-accent" role="alert">
          {stepError}
        </p>
      )}

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-hairline">
        {step > 1 ? (
          <button
            type="button"
            onClick={onBack}
            className="font-sans text-sm text-muted hover:text-ink transition-colors"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}

        {step === 1.5 ? (
          <span />
        ) : step < TOTAL_QUESTIONS ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canContinue}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Get my AI report →
          </button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Question building blocks                                            */
/* ------------------------------------------------------------------ */

function QuestionField({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="font-serif text-2xl sm:text-3xl text-ink leading-[1.1] mb-2">
        {title}
      </legend>
      <p className="text-sm text-muted mb-6">{subtitle}</p>
      {children}
    </fieldset>
  );
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-4 rounded-lg border px-4 py-4 cursor-pointer transition-colors ${
            value === option.value
              ? "border-accent bg-canvas"
              : "border-hairline bg-canvas hover:border-muted"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 accent-accent"
          />
          <span className="font-sans text-base text-ink">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex items-center gap-4 rounded-lg border px-4 py-4 cursor-pointer transition-colors ${
              checked
                ? "border-accent bg-canvas"
                : "border-hairline bg-canvas hover:border-muted"
            }`}
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => toggle(option.value)}
              className="h-4 w-4 accent-accent"
            />
            <span className="font-sans text-base text-ink">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / results                                                   */
/* ------------------------------------------------------------------ */

function CopyLinkButton({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const link = `${window.location.origin}/report/${sessionId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API can be blocked (permissions / insecure context) —
      // fall back to the legacy path so the action never silently fails.
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    track("report_link_copy", { sessionId });
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      data-cta="copy-report-link"
      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-accent px-5 py-2.5 font-sans text-sm font-medium text-accent transition-colors hover:bg-canvas"
    >
      {copied ? "Link copied ✓" : "Copy my results link"}
    </button>
  );
}

function AnalyzingState() {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-12 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-hairline">
        <div className="h-6 w-6 animate-pulse rounded-full bg-accent" />
      </div>
      <p className="font-serif text-2xl sm:text-3xl text-ink mb-3">
        Analyzing your business...
      </p>
      <p className="text-sm text-muted max-w-md mx-auto">
        We&apos;re matching your answers against proven automation playbooks.
        This takes about 20 seconds.
      </p>
    </div>
  );
}

function ResultsView({
  result,
  sessionId,
  onCheckout,
  checkoutPending,
  checkoutError,
}: {
  result: AssessmentResult;
  sessionId: string;
  onCheckout: (tier: Tier) => void;
  checkoutPending: Tier | null;
  checkoutError: string;
}) {
  useEffect(() => {
    track("paywall_view");
  }, []);
  const teaser = result.recommendations[0];
  return (
    <div>
      {/* Big number */}
      <div className="rounded-lg border border-hairline bg-surface p-8 sm:p-10 mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-4">
          Your AI opportunity
        </p>
        <p className="font-serif text-4xl sm:text-5xl text-ink leading-[1.05]">
          {result.estimated_savings}
          <span className="block text-xl sm:text-2xl text-body mt-3">
            in potential savings
          </span>
        </p>

        {/* Opportunity score */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Opportunity score
            </p>
            <p className="font-mono text-sm text-accent font-medium">
              {result.opportunity_score}/100
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-hairline overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${result.opportunity_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Saved-work anchor: the report URL is the canonical return link */}
      <div className="rounded-lg border border-hairline bg-canvas p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-sm text-muted leading-snug">
          Your results are saved at a private link. Copy it now to come back
          any time — even after closing this tab.
        </p>
        <CopyLinkButton sessionId={sessionId} />
      </div>

      {/* Teaser: first recommendation, free */}
      {teaser && (
        <>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-ink">
              Your top automation opportunity
            </h2>
            <p className="font-mono text-xs text-muted shrink-0 ml-4">
              1 of {result.recommendations.length + result.locked_count}
            </p>
          </div>
          <ol className="space-y-4 mb-4">
            <li
              className="rounded-lg border border-hairline bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="font-serif text-lg text-ink">
                  <span className="font-mono text-muted mr-2">1.</span>
                  {teaser.title}
                </p>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider ${DIFFICULTY_STYLES[teaser.difficulty]}`}
                >
                  {teaser.difficulty}
                </span>
              </div>
              <p className="text-sm text-body leading-relaxed mb-3">
                {teaser.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
                <span>{IMPACT_LABELS[teaser.impact]}</span>
                <span aria-hidden="true">·</span>
                <span>Saves {teaser.estimated_time_saved}</span>
              </div>
            </li>

            {/* Locked opportunities — visible count, hidden content */}
            {Array.from({ length: result.locked_count }).map((_, i) => (
              <li
                key={i}
                className="rounded-lg border border-hairline bg-canvas p-6 flex items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0" aria-hidden="true">
                  <div className="h-3 rounded bg-hairline w-3/4" />
                  <div className="h-3 rounded bg-hairline w-1/2" />
                </div>
                <span className="shrink-0 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider bg-hairline text-muted">
                  🔒 In full report
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Paywall */}
      <div className="rounded-lg border-2 border-accent bg-surface p-8 sm:p-10 mt-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-3">
          Your full report is ready
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight mb-4">
          Unlock your full AI Readiness Report
        </h2>
        <p className="text-sm text-muted mb-6">
          We analyzed your answers against proven automation playbooks. Your
          full report adds everything below — delivered instantly on screen
          after payment.
        </p>
        <ul className="space-y-2.5 mb-4">
          {result.locked_sections.map((section) => (
            <li key={section} className="flex items-start gap-2.5">
              <span className="font-mono text-accent text-sm shrink-0">✓</span>
              <span className="text-sm text-body">{section}</span>
            </li>
          ))}
        </ul>
        <a
          href="/sample-report"
          data-cta="paywall-sample-link"
          className="inline-block mb-8 font-sans text-sm text-accent underline underline-offset-4 hover:text-ink"
        >
          See a full sample report — exactly what you&apos;ll get →
        </a>

        <button
          type="button"
          onClick={() => onCheckout("report")}
          disabled={checkoutPending !== null}
          data-cta="unlock-report"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-4 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checkoutPending === "report"
            ? "Opening secure checkout..."
            : "Unlock my full report — $149 →"}
        </button>

        <button
          type="button"
          onClick={() => onCheckout("session")}
          disabled={checkoutPending !== null}
          data-cta="unlock-session"
          className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-accent px-8 py-4 font-sans text-sm font-medium text-accent transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checkoutPending === "session"
            ? "Opening secure checkout..."
            : "Add a 60-min strategy session — $499 →"}
        </button>

        {checkoutError && (
          <p className="mt-4 text-sm text-accent text-center" role="alert">
            {checkoutError}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Secure payment via Stripe · 14-day refund guarantee ·{" "}
          <a href="/refunds" className="underline underline-offset-4 hover:text-ink">
            Refund policy
          </a>
        </p>
      </div>

      {/* Free-path CTA */}
      <p className="mt-6 text-center text-sm">
        <a href="/contact" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          Not ready to buy? Book a free strategy call instead
        </a>
      </p>

      {/* Disclaimer */}
      <p className="mt-8 text-xs text-muted leading-relaxed">
        {result.disclaimer}
      </p>
    </div>
  );
}
