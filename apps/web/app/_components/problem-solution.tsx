export function ProblemSolution() {
  const problems = [
    "AI tools die los draaien, geen samenhang",
    "Geen controle over wat je AI mag en kan",
    "Elke use case vraagt custom development",
    "AI zonder geheugen of persoonlijkheid",
  ];

  const solutions = [
    "Eén platform om AI employees te bouwen en runnen",
    "Guardrails, grenzen en sandbox testing",
    "Custom skills die je hergebruikt across employees",
    "Soul memory — ze leren, onthouden en groeien",
  ];

  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <p className="text-accent font-semibold text-xs uppercase tracking-widest">
                Het probleem
              </p>
            </div>
            <h2 className="text-3xl font-extrabold text-primary mb-8 tracking-tight">
              AI inzetten is te complex
            </h2>
            <ul className="space-y-4">
              {problems.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-red-400 text-xs shrink-0">
                    ✕
                  </span>
                  <span className="text-primary-500">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <p className="text-accent font-semibold text-xs uppercase tracking-widest">
                De oplossing
              </p>
            </div>
            <h2 className="text-3xl font-extrabold text-primary mb-8 tracking-tight">
              VDM Nexus maakt het simpel
            </h2>
            <ul className="space-y-4">
              {solutions.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-accent-50 flex items-center justify-center text-accent text-xs shrink-0">
                    ✓
                  </span>
                  <span className="text-primary-500">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
