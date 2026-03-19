import { User, MousePointerClick, Brain, Zap, FolderUp, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: User,
    title: "Employee Builder",
    description:
      "Creëer AI employees met een visuele builder. Geef ze een naam, persoonlijkheid, taal en rol — maak ze uniek voor jouw business.",
  },
  {
    icon: MousePointerClick,
    title: "Custom Skills",
    description:
      "Voeg pre-built skills toe of bouw je eigen skills met triggers, acties en condities. Van incasso tot klantenservice — alles is mogelijk.",
  },
  {
    icon: Brain,
    title: "Soul Memory",
    description:
      "Geef je employee een ziel. Persistent geheugen, context en persoonlijkheid die meegroeien met elke interactie. Ze leren en onthouden.",
  },
  {
    icon: Zap,
    title: "Any LLM",
    description:
      "Kies het model dat past bij de taak. Claude, GPT, Gemini, of open source. Wissel wanneer je wilt, zonder downtime.",
  },
  {
    icon: FolderUp,
    title: "Knowledge Base",
    description:
      "Upload documenten, verbind databronnen, geef je employee domeinexpertise. Van PDF's tot spreadsheets — ze weten wat jij weet.",
  },
  {
    icon: ShieldCheck,
    title: "Guardrails & Sandbox",
    description:
      "Stel grenzen in voor wat je employee mag doen. Test veilig in de sandbox voordat je deployed. Volledige controle, nul risico.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-primary-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="text-accent font-semibold text-xs uppercase tracking-widest">
              Platform
            </p>
          </div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">
            Alles om je AI employee te creëren
          </h2>
          <p className="text-primary-500 mt-3 max-w-lg mx-auto">
            Van persoonlijkheid tot skills, van geheugen tot guardrails. Jij
            bepaalt wie je employee is en wat die kan.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-8 border border-primary-200 hover:border-accent/30 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-base font-bold text-primary mb-2">
                {f.title}
              </h3>
              <p className="text-primary-500 text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
