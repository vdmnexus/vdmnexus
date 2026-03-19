"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, useCase }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        setCompany("");
        setUseCase("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-8 text-center">
        <p className="text-accent-700 text-lg font-semibold">
          Je staat op de lijst!
        </p>
        <p className="text-accent-600 text-sm mt-2">
          We nemen snel contact op.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <input
        type="email"
        required
        placeholder="je@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white border border-primary-200 text-primary placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        type="text"
        placeholder="Bedrijfsnaam (optioneel)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white border border-primary-200 text-primary placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        placeholder="Waarvoor wil je AI agents inzetten?"
        rows={3}
        value={useCase}
        onChange={(e) => setUseCase(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white border border-primary-200 text-primary placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-4 bg-primary-900 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
      >
        {status === "loading" ? "Even geduld..." : "Aanmelden voor waitlist"}
      </button>
      {status === "error" && (
        <p className="text-red-500 text-sm text-center">
          Er ging iets mis. Probeer het opnieuw.
        </p>
      )}
    </form>
  );
}
