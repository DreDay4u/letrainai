"use client";

import { useState } from "react";
import Link from "next/link";
import { Section } from "@/components/layout/section";

const SERVICES = [
  "AI Automation",
  "AI-Enhanced Website",
  "AI Consulting",
  "Workflow Automation",
  "Not sure yet",
] as const;

const COMPANY_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"] as const;

const TIME_PREFS = ["Morning", "Afternoon", "Evening", "Anytime"] as const;

const TRUST_ITEMS = [
  "We respond within 24 hours",
  "No sales calls unless you request one",
  "Your data stays private",
];

interface FormState {
  service: string;
  name: string;
  industry: string;
  companySize: string;
  email: string;
  phone: string;
  preferredTime: string;
  message: string;
}

const initialForm: FormState = {
  service: "",
  name: "",
  industry: "",
  companySize: "",
  email: "",
  phone: "",
  preferredTime: "",
  message: "",
};

export default function ContactPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 2 && !form.name.trim()) {
      nextErrors.name = "Your name is required.";
    }

    if (currentStep === 3) {
      if (!form.name.trim()) nextErrors.name = "Your name is required.";
      if (!form.email.trim()) {
        nextErrors.email = "Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        nextErrors.email = "Please enter a valid email address.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {
      // API route arrives in Phase 3 — swallow for now
    }
    setSubmitted(true);
  };

  return (
    <main className="bg-canvas text-body">
      {/* Header — left-biased */}
      <Section maxWidth="narrow" className="pb-10 sm:pb-14 pt-24 sm:pt-32">
        <div className="border-b border-hairline pb-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Contact
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-[1.05] max-w-2xl">
            Let&apos;s Talk About Your AI Future
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl">
            We respond within 24 hours. No sales pressure.
          </p>
        </div>
      </Section>

      {/* Split layout */}
      <Section maxWidth="default" className="pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-16 gap-y-12">
          {/* LEFT — info column */}
          <aside className="lg:col-span-4">
            {/* Assessment nudge */}
            <div className="border border-hairline rounded-lg p-5 mb-8 bg-surface">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-2">
                Prefer to assess first?
              </p>
              <p className="text-body text-sm leading-relaxed">
                Start with our{" "}
                <Link
                  href="/assessment"
                  className="text-accent underline-offset-4 hover:underline font-medium"
                >
                  free AI assessment
                </Link>{" "}
                instead.
              </p>
            </div>

            {/* Contact details */}
            <dl className="space-y-5 mb-10">
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-1">
                  Email
                </dt>
                <dd>
                  <a
                    href="mailto:andre@letrainai.com"
                    className="text-ink text-base underline-offset-4 hover:underline"
                  >
                    andre@letrainai.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-1">
                  Location
                </dt>
                <dd className="text-ink text-base">[City, State]</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-1">
                  Hours
                </dt>
                <dd className="text-ink text-base">
                  Available across US time zones
                </dd>
              </div>
            </dl>

            {/* Trust elements */}
            <div className="border-t border-hairline pt-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-4">
                What to expect
              </p>
              <ul className="space-y-3">
                {TRUST_ITEMS.map((item) => (
                  <li key={item} className="flex items-baseline gap-3 text-body">
                    <span className="font-mono text-accent text-sm shrink-0">
                      ✓
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* RIGHT — multi-step form */}
          <div className="lg:col-span-8">
            {submitted ? (
              <SuccessMessage />
            ) : (
              <form
                onSubmit={handleSubmit}
                className="border border-hairline rounded-lg bg-surface p-6 sm:p-10"
                noValidate
              >
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-8">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                    Step {step} of 3
                  </p>
                  <div className="flex gap-2" aria-hidden="true">
                    {[1, 2, 3].map((s) => (
                      <span
                        key={s}
                        className={`h-1 w-10 rounded-full transition-colors ${
                          s <= step ? "bg-accent" : "bg-hairline"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {step === 1 && (
                  <Step1
                    service={form.service}
                    onChange={(v) => update("service", v)}
                  />
                )}

                {step === 2 && (
                  <Step2
                    name={form.name}
                    industry={form.industry}
                    companySize={form.companySize}
                    errors={errors}
                    onChange={update}
                  />
                )}

                {step === 3 && (
                  <Step3
                    email={form.email}
                    phone={form.phone}
                    preferredTime={form.preferredTime}
                    message={form.message}
                    errors={errors}
                    onChange={update}
                  />
                )}

                {/* Nav buttons */}
                <div className="flex items-center justify-between mt-10 pt-6 border-t border-hairline">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={back}
                      className="font-sans text-sm text-muted hover:text-ink transition-colors"
                    >
                      ← Back
                    </button>
                  ) : (
                    <span />
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      Continue →
                    </button>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                      >
                        Send my message →
                      </button>
                      <p className="font-mono text-xs text-muted">
                        We never share your data.
                      </p>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>
    </main>
  );
}

/* ---------- Step components ---------- */

function Step1({
  service,
  onChange,
}: {
  service: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-serif text-2xl sm:text-3xl text-ink leading-[1.1] mb-2">
        What do you need?
      </legend>
      <p className="text-sm text-muted mb-6">
        Choose the area closest to what you&apos;re looking for.
      </p>
      <div className="space-y-3">
        {SERVICES.map((option) => (
          <label
            key={option}
            className={`flex items-center gap-4 rounded-lg border px-4 py-4 cursor-pointer transition-colors ${
              service === option
                ? "border-accent bg-canvas"
                : "border-hairline bg-canvas hover:border-muted"
            }`}
          >
            <input
              type="radio"
              name="service"
              value={option}
              checked={service === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-accent"
            />
            <span className="font-sans text-base text-ink">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Step2({
  name,
  industry,
  companySize,
  errors,
  onChange,
}: {
  name: string;
  industry: string;
  companySize: string;
  errors: Record<string, string>;
  onChange: (field: keyof FormState, value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-serif text-2xl sm:text-3xl text-ink leading-[1.1] mb-2">
        Tell us about your business
      </legend>
      <p className="text-sm text-muted mb-6">
        Context helps us prepare a relevant response.
      </p>

      <div className="space-y-5">
        <Field
          label="Name"
          required
          error={errors.name}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </Field>

        <Field label="Industry">
          <input
            type="text"
            value={industry}
            onChange={(e) => onChange("industry", e.target.value)}
            placeholder="e.g. Healthcare, Real Estate, SaaS"
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </Field>

        <Field label="Company size">
          <select
            value={companySize}
            onChange={(e) => onChange("companySize", e.target.value)}
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          >
            <option value="">Select a range</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} employees
              </option>
            ))}
          </select>
        </Field>
      </div>
    </fieldset>
  );
}

function Step3({
  email,
  phone,
  preferredTime,
  message,
  errors,
  onChange,
}: {
  email: string;
  phone: string;
  preferredTime: string;
  message: string;
  errors: Record<string, string>;
  onChange: (field: keyof FormState, value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-serif text-2xl sm:text-3xl text-ink leading-[1.1] mb-2">
        How can we reach you?
      </legend>
      <p className="text-sm text-muted mb-6">
        We&apos;ll be in touch within one business day.
      </p>

      <div className="space-y-5">
        <Field label="Email" required error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="jane@company.com"
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </Field>

        <Field label="Phone (optional)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="(555) 555-5555"
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </Field>

        <Field label="Preferred time">
          <select
            value={preferredTime}
            onChange={(e) => onChange("preferredTime", e.target.value)}
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          >
            <option value="">No preference</option>
            {TIME_PREFS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Message (optional)">
          <textarea
            value={message}
            onChange={(e) => onChange("message", e.target.value)}
            rows={4}
            placeholder="Tell us a bit about what you're trying to solve..."
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 font-sans text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none"
          />
        </Field>
      </div>
    </fieldset>
  );
}

/* ---------- Reusable field wrapper ---------- */

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.2em] text-muted mb-2">
        {label}
        {required && <span className="text-accent">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Success state ---------- */

function SuccessMessage() {
  return (
    <div className="border border-hairline rounded-lg bg-surface p-10 sm:p-14 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent text-white text-2xl mb-6">
        ✓
      </div>
      <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-[1.1] mb-3">
        Thanks! We&apos;ll get back to you within 24 hours.
      </h2>
      <p className="text-muted text-base max-w-md mx-auto">
        Keep an eye on your inbox — we review every message personally.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 mt-8 font-sans text-sm text-accent underline-offset-4 hover:underline transition-colors"
      >
        ← Back to home
      </Link>
    </div>
  );
}
