"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const TIMELINE_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "asap", label: "ASAP / this quarter" },
  { value: "1-3 months", label: "1–3 months" },
  { value: "3-6 months", label: "3–6 months" },
  { value: "6+ months", label: "6+ months / exploratory" },
];

export function EnterpriseInquiryForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      email: String(fd.get("email") || "").trim(),
      contact_name: String(fd.get("contact_name") || "").trim() || null,
      company: String(fd.get("company") || "").trim() || null,
      role: String(fd.get("role") || "").trim() || null,
      use_case: String(fd.get("use_case") || "").trim(),
      sla_requirements: String(fd.get("sla_requirements") || "").trim() || null,
      volume_estimate: String(fd.get("volume_estimate") || "").trim() || null,
      timeline: String(fd.get("timeline") || "").trim() || null,
      regulatory_context:
        String(fd.get("regulatory_context") || "").trim() || null,
      website: String(fd.get("website") || ""), // honeypot
      source_path: typeof window !== "undefined" ? window.location.pathname : "/pricing",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      utm_source:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_source")
          : null,
      utm_medium:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_medium")
          : null,
      utm_campaign:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_campaign")
          : null,
    };

    if (!payload.email || !payload.use_case) {
      setStatus({
        kind: "error",
        message: "Email and use case are required.",
      });
      return;
    }

    setStatus({ kind: "submitting" });

    try {
      const res = await fetch("/api/enterprise-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        const map: Record<string, string> = {
          invalid_email: "That email doesn't look valid.",
          missing_use_case: "Tell us briefly what you're trying to do.",
          rate_limited: "You've submitted a few times recently — drop a note at dennis@vdmnexus.com instead.",
          service_unavailable: "The form is temporarily down. Email dennis@vdmnexus.com.",
        };
        const message =
          (data.error && map[data.error]) ??
          "Something went wrong. Email dennis@vdmnexus.com.";
        setStatus({ kind: "error", message });
        return;
      }
      setStatus({ kind: "success" });
      form.reset();
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the server. Email dennis@vdmnexus.com.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="rounded-2xl border border-accent-indigo/40 bg-accent-indigo/10 p-8 sm:p-10">
        <h3 className="text-base font-semibold text-text">
          Got it — thanks.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          You'll hear back from <code>dennis@vdmnexus.com</code> within 48 hours
          (usually same day). Beta-tier evaluations go through the founder
          directly; v1-tier requirements land into the Business tier the moment
          it ships.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      aria-label="Enterprise inquiry form"
    >
      {/* Honeypot — hidden from humans, bots happily fill it */}
      <div className="hidden" aria-hidden="true">
        <label>
          Don't fill this field:
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Work email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
        <Field
          label="Your name"
          name="contact_name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
        />
        <Field
          label="Company"
          name="company"
          type="text"
          autoComplete="organization"
          placeholder="Acme, Inc."
        />
        <Field
          label="Role"
          name="role"
          type="text"
          autoComplete="organization-title"
          placeholder="VP Engineering, Compliance Lead, etc."
        />
      </div>

      <Field
        as="textarea"
        label="Use case"
        name="use_case"
        required
        rows={4}
        placeholder="What are you trying to do? E.g. 'audit-trail for an EU-regulated trading agent', 'verified evidence for a model output review process', etc."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Required SLAs"
          name="sla_requirements"
          type="text"
          placeholder="e.g. 99.9% uptime, p95 < 300ms"
        />
        <Field
          label="Monthly volume (rough)"
          name="volume_estimate"
          type="text"
          placeholder="e.g. ~50K calls/month"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Timeline"
          name="timeline"
          options={TIMELINE_OPTIONS}
        />
        <Field
          label="Regulatory context"
          name="regulatory_context"
          type="text"
          placeholder="e.g. MiFID II audit trail, SOC 2, EU AI Act art. 12"
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status.kind === "submitting"}
          className="inline-flex items-center justify-center rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.kind === "submitting" ? "Sending…" : "Send inquiry"}
        </button>
        <p className="text-[11px] text-text-muted">
          Or email{" "}
          <a
            href="mailto:dennis@vdmnexus.com"
            className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            dennis@vdmnexus.com
          </a>
          {" "}directly.
        </p>
      </div>

      {status.kind === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {status.message}
        </p>
      )}
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  rows?: number;
  as?: "input" | "textarea";
};

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
  rows,
  as = "input",
}: FieldProps) {
  const fieldId = `enterprise-${name}`;
  const baseClass =
    "w-full rounded-md border border-soft bg-bg/40 px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-accent-indigo/60";
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
        {label}
        {required && <span className="ml-1 text-accent-indigo">*</span>}
      </span>
      {as === "textarea" ? (
        <textarea
          id={fieldId}
          name={name}
          required={required}
          placeholder={placeholder}
          rows={rows ?? 4}
          className={baseClass + " resize-y"}
        />
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={baseClass}
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
}) {
  const fieldId = `enterprise-${name}`;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
      <select
        id={fieldId}
        name={name}
        defaultValue=""
        className="w-full rounded-md border border-soft bg-bg/40 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent-indigo/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
