"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, register } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await register(email, password, name || undefined);
      } else {
        await login(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-900">
            <span className="text-sm font-bold text-white">N</span>
          </div>
          <span className="text-base font-semibold text-primary">VDM Nexus</span>
        </div>

        <div className="rounded-2xl border border-primary-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-primary text-center mb-1">
            {mode === "login" ? "Inloggen" : "Account aanmaken"}
          </h1>
          <p className="text-sm text-primary-400 text-center mb-6">
            {mode === "login"
              ? "Log in om je AI employees te beheren"
              : "Maak een account aan om te starten"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Naam"
                className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mailadres"
              className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              minLength={6}
              className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
            />

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-900 py-3 text-sm font-semibold text-white hover:bg-primary-800 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Even geduld..."
                : mode === "login"
                  ? "Inloggen"
                  : "Account aanmaken"}
            </button>
          </form>

          <p className="text-xs text-primary-400 text-center mt-4">
            {mode === "login" ? (
              <>
                Nog geen account?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} className="text-primary font-medium hover:underline">
                  Registreren
                </button>
              </>
            ) : (
              <>
                Al een account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-medium hover:underline">
                  Inloggen
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-xs text-primary-400 text-center mt-6">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Terug naar vdmnexus.com
          </Link>
        </p>
      </div>
    </div>
  );
}
