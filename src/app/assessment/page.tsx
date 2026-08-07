"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Section } from "@/components/layout/section";

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

interface AssessmentResult {
  opportunity_score: number;
  estimated_savings: string;
  recommendations: Recommendation[];
  next_steps: string;
  disclaimer: string;
}

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

export default function AssessmentPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<AssessmentAnswers>(initialAnswers);
  const [sessionId, setSessionId] = useState<string>("");
  const [status, setStatus] = useState<Status>("form");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [stepError, setStepError] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "submitting" | "done">(
    "idle"
  );

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return answers.industry !== "";
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
    setStep((s) => Math.min(s + 1, TOTAL_QUESTIONS));
  };

  const back = () => {
    setStepError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    setApiError("");
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
        return;
      }

      if (!res.ok) {
        setApiError("Something went wrong generating your report. Please try again.");
        setStatus("error");
        return;
      }

      const data: AssessmentResult = await res.json();
      setResult(data);
      setStatus("results");
    } catch {
      setApiError("Something went wrong generating your report. Please try again.");
      setStatus("error");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setEmailStatus("submitting");
    try {
      await fetch("/api/assessment/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, email: trimmed }),
      });
      setEmailStatus("done");
    } catch {
      setEmailStatus("idle");
      setEmailError("Something went wrong. Please try again.");
    }
  };

  return (
    <main className="bg-canvas text-body">
      {/* Header */}
      <Section maxWidth="narrow" className="pb-10 sm:pb-14 pt-24 sm:pt-32">
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
      </Section>

      {/* Form / loading / results */}
      <Section maxWidth="narrow" className="pt-0 pb-24">
        {status === "form" && (
          <StepForm
            step={step}
            answers={answers}
            setAnswers={setAnswers}
            canContinue={canContinue}
            stepError={stepError}
            onNext={next}
            onBack={back}
            onSubmit={handleSubmit}
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
            email={email}
            setEmail={setEmail}
            emailError={emailError}
            emailStatus={emailStatus}
            onEmailSubmit={handleEmailSubmit}
          />
        )}
      </Section>
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
  onNext,
  onBack,
  onSubmit,
}: {
  step: number;
  answers: AssessmentAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<AssessmentAnswers>>;
  canContinue: boolean;
  stepError: string;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
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
            Question {step} of {TOTAL_QUESTIONS}
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

        {step < TOTAL_QUESTIONS ? (
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
  email,
  setEmail,
  emailError,
  emailStatus,
  onEmailSubmit,
}: {
  result: AssessmentResult;
  email: string;
  setEmail: (value: string) => void;
  emailError: string;
  emailStatus: "idle" | "submitting" | "done";
  onEmailSubmit: (e: React.FormEvent) => void;
}) {
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

      {/* Recommendations */}
      <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-6">
        Your top automation opportunities
      </h2>
      <ol className="space-y-4 mb-8">
        {result.recommendations.map((rec, i) => (
          <li
            key={rec.title}
            className="rounded-lg border border-hairline bg-surface p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="font-serif text-lg text-ink">
                <span className="font-mono text-muted mr-2">{i + 1}.</span>
                {rec.title}
              </p>
              <span
                className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider ${DIFFICULTY_STYLES[rec.difficulty]}`}
              >
                {rec.difficulty}
              </span>
            </div>
            <p className="text-sm text-body leading-relaxed mb-3">
              {rec.description}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
              <span>{IMPACT_LABELS[rec.impact]}</span>
              <span aria-hidden="true">·</span>
              <span>Saves {rec.estimated_time_saved}</span>
            </div>
          </li>
        ))}
      </ol>

      {/* Next steps */}
      <div className="rounded-lg border border-hairline bg-surface p-6 mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-2">
          Recommended next step
        </p>
        <p className="text-body leading-relaxed">{result.next_steps}</p>
      </div>

      {/* CTA */}
      <div className="text-center mb-10">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Book my strategy call to implement these →
        </Link>
      </div>

      {/* Email gate */}
      {emailStatus === "done" ? (
        <div className="rounded-lg border border-accent bg-surface p-8 text-center">
          <p className="font-serif text-2xl text-ink mb-2">
            Check your inbox!
          </p>
          <p className="text-sm text-muted">
            Your full report is on its way.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-hairline bg-surface p-8">
          <p className="font-serif text-xl sm:text-2xl text-ink mb-2">
            Enter your email to save your full report
          </p>
          <p className="text-sm text-muted mb-6">
            Get personalized recommendations and a detailed breakdown — free,
            no spam.
          </p>
          <form
            onSubmit={onEmailSubmit}
            className="flex flex-col sm:flex-row gap-3"
            noValidate
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
            <button
              type="submit"
              disabled={emailStatus === "submitting"}
              className="rounded-lg bg-accent px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {emailStatus === "submitting" ? "Sending..." : "Send my report"}
            </button>
          </form>
          {emailError && (
            <p className="mt-3 text-sm text-accent" role="alert">
              {emailError}
            </p>
          )}
          <p className="mt-5 text-sm">
            <Link
              href="/contact"
              className="text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              No thanks, I&apos;ll book a call instead
            </Link>
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-8 text-xs text-muted leading-relaxed">
        {result.disclaimer}
      </p>
    </div>
  );
}
