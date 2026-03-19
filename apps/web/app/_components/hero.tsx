import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-50 px-6 sm:px-20 py-16 lg:py-20">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left: Text */}
        <div className="max-w-xl flex-shrink-0">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="text-accent font-semibold tracking-widest uppercase text-xs">
              AI Employee Platform
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-primary leading-[1.08] tracking-tight mb-6">
            Build AI Employees for Your Business.
          </h1>
          <p className="text-lg text-primary-500 mb-8 max-w-md leading-relaxed">
            Bouw, configureer en run AI employees met custom skills, geheugen en
            persoonlijkheid. Kies je model, wijs taken toe — VDM Nexus doet de
            rest.
          </p>
          <div className="flex gap-3 mb-8">
            <Link
              href="#waitlist"
              className="inline-flex items-center px-7 py-3.5 bg-primary-900 text-white font-semibold rounded-xl hover:bg-primary-800 transition-colors text-sm"
            >
              Start met bouwen
            </Link>
            <Link
              href="https://deparmentier.vdmnexus.com"
              className="inline-flex items-center px-7 py-3.5 border border-primary-300 text-primary font-semibold rounded-xl hover:bg-primary-100 transition-colors text-sm"
            >
              Bekijk demo
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-xs text-primary-400">
              <span className="h-1 w-1 rounded-full bg-accent" />
              Custom Skills
            </span>
            <span className="flex items-center gap-1.5 text-xs text-primary-400">
              <span className="h-1 w-1 rounded-full bg-accent" />
              Soul Memory
            </span>
            <span className="flex items-center gap-1.5 text-xs text-primary-400">
              <span className="h-1 w-1 rounded-full bg-accent" />
              Any LLM
            </span>
          </div>
        </div>

        {/* Right: Platform preview */}
        <div className="flex-1 w-full max-w-2xl">
          <div className="rounded-2xl border border-primary-200 bg-white shadow-xl shadow-primary-900/[0.08] overflow-hidden">
            {/* Topbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary-200">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-900">
                  <span className="text-[9px] font-bold text-white">N</span>
                </div>
                <span className="text-xs font-semibold text-primary">VDM Nexus</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-primary-400">
                <span>Employees</span>
                <span>Skills</span>
                <span className="font-semibold text-primary">Create</span>
              </div>
            </div>
            {/* Body */}
            <div className="flex min-h-[340px]">
              {/* Left: Identity */}
              <div className="w-44 border-r border-primary-200 p-4 flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
                  S
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-primary">Sophie</p>
                  <p className="text-[10px] text-primary-400">Vastgoedbeheer AI Employee</p>
                </div>
                <div className="w-full space-y-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400">Persoonlijkheid</p>
                  {[
                    { left: "Formeel", right: "Informeel", pct: 35 },
                    { left: "Reactief", right: "Proactief", pct: 75 },
                    { left: "Vraagt altijd", right: "Autonoom", pct: 55 },
                  ].map((s) => (
                    <div key={s.left} className="space-y-1">
                      <div className="flex justify-between text-[8px] text-primary-400">
                        <span>{s.left}</span>
                        <span>{s.right}</span>
                      </div>
                      <div className="h-1 rounded-full bg-primary-100 relative">
                        <div
                          className="absolute left-0 top-0 h-1 rounded-full bg-accent"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400 mb-1.5">Taal</p>
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 text-[9px] font-medium bg-primary-900 text-white rounded">NL</span>
                      <span className="px-2 py-0.5 text-[9px] font-medium bg-primary-100 text-primary-600 rounded">EN</span>
                      <span className="px-2 py-0.5 text-[9px] font-medium bg-primary-100 text-primary-600 rounded">DE</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right: Config */}
              <div className="flex-1 p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400 mb-1">Model</p>
                    <div className="flex items-center justify-between px-2.5 py-1.5 border border-primary-200 rounded-lg text-xs text-primary">
                      Claude Sonnet 4 <span className="text-primary-300">v</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400 mb-1">Geheugen</p>
                    <div className="flex items-center justify-between px-2.5 py-1.5 border border-primary-200 rounded-lg text-xs text-primary">
                      Persistent + Context <span className="text-primary-300">v</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400 mb-1">Soul Memory</p>
                  <div className="px-2.5 py-2 border border-primary-200 rounded-lg text-[10px] text-primary-600 leading-relaxed">
                    Je bent Sophie, AI employee bij VDM Vastgoed. Je beheert 5 panden in Amsterdam. Je bent professioneel maar warm, en handelt zelfstandig als het kan.
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400">Skills</p>
                    <span className="text-[9px] font-semibold text-accent border border-primary-200 rounded px-1.5 py-0.5">+ Custom Skill</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {["Huurincasso", "Onderhoud", "Communicatie", "Rapportage"].map((s) => (
                      <span key={s} className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-accent-50 text-accent-700 rounded border border-accent-200">
                        <span className="h-1 w-1 rounded-full bg-accent" />
                        {s}
                      </span>
                    ))}
                    <span className="px-2 py-1 text-[9px] text-primary-400 border border-dashed border-primary-300 rounded">+ Toevoegen</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400 mb-1">Knowledge Base</p>
                  <div className="flex gap-1">
                    <span className="px-2 py-1 text-[9px] bg-primary-100 text-primary-600 rounded">huisregels.pdf</span>
                    <span className="px-2 py-1 text-[9px] bg-primary-100 text-primary-600 rounded">contracten-2026.xlsx</span>
                    <span className="px-2 py-1 text-[9px] text-primary-400 border border-dashed border-primary-300 rounded">+ Upload</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-primary-400 mb-1">Guardrails</p>
                  <div className="flex flex-wrap gap-1">
                    {["Max €500 zonder goedkeuring", "Geen contracten wijzigen", "Altijd Nederlands"].map((g) => (
                      <span key={g} className="flex items-center gap-1 px-2 py-1 text-[9px] text-primary-600 border border-primary-200 rounded">
                        <span className="h-1 w-1 rounded-full bg-green-500" />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <span className="px-4 py-2 text-[10px] font-semibold bg-primary-900 text-white rounded-lg">Deploy Employee</span>
                  <span className="px-4 py-2 text-[10px] font-semibold text-primary-600 border border-primary-200 rounded-lg">Test in Sandbox</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
