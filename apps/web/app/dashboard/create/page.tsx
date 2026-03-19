"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Building2, Headset, DoorOpen, Mail, MessageSquare, Sparkles } from "lucide-react";
import { createEmployee, assignSkill, deployEmployee, getSkills, type Skill } from "../../../lib/api";
import { useEffect } from "react";

// ─── Role Templates ──────────────────────────────────────

const roleTemplates = [
  {
    id: "vastgoedbeheer",
    icon: Building2,
    name: "Vastgoedbeheer",
    beschrijving: "Beheert panden, huurders, facturen, onderhoud en contracten",
    skills: ["Huurincasso", "Onderhoud", "Communicatie", "Rapportage", "Contractbeheer"],
    soulMemory: "Je bent een professionele AI employee voor vastgoedbeheer. Je beheert panden, houdt huurders tevreden, monitort facturen en coördineert onderhoud. Je communiceert helder en handelt proactief.",
    personality: { tone: 30, proactivity: 75, autonomy: 60 },
  },
  {
    id: "klantenservice",
    icon: Headset,
    name: "Klantenservice",
    beschrijving: "Beantwoordt vragen, verwerkt klachten en beheert e-mail",
    skills: ["Klantenservice", "Communicatie", "Email Management"],
    soulMemory: "Je bent een vriendelijke en geduldige AI employee voor klantenservice. Je beantwoordt vragen snel en accuraat, verwerkt klachten empathisch en zorgt dat klanten zich gehoord voelen.",
    personality: { tone: 65, proactivity: 50, autonomy: 40 },
  },
  {
    id: "receptie",
    icon: DoorOpen,
    name: "Receptie",
    beschrijving: "Ontvangt bezoekers, beheert afspraken en verstrekt informatie",
    skills: ["Receptie", "Communicatie"],
    soulMemory: "Je bent de receptionist. Je verwelkomt bezoekers warm, helpt met afspraken en verstrekt informatie over het gebouw. Je bent altijd beleefd en behulpzaam.",
    personality: { tone: 55, proactivity: 60, autonomy: 35 },
  },
  {
    id: "communicatie",
    icon: Mail,
    name: "Communicatie & Email",
    beschrijving: "Stelt berichten op, beheert inbox en verzorgt correspondentie",
    skills: ["Communicatie", "Email Management", "Rapportage"],
    soulMemory: "Je bent verantwoordelijk voor alle communicatie. Je stelt professionele berichten op, beheert de inbox, en zorgt dat alle correspondentie tijdig en correct wordt afgehandeld.",
    personality: { tone: 25, proactivity: 65, autonomy: 55 },
  },
];

// ─── Personality Presets ─────────────────────────────────

const personalityPresets = [
  {
    id: "zakelijk",
    label: "Zakelijk & Professioneel",
    beschrijving: "Formeel, efficiënt, houdt zich aan de feiten",
    personality: { tone: 20, proactivity: 60, autonomy: 55 },
  },
  {
    id: "warm",
    label: "Warm & Persoonlijk",
    beschrijving: "Vriendelijk, empathisch, bouwt relaties op",
    personality: { tone: 70, proactivity: 55, autonomy: 45 },
  },
  {
    id: "direct",
    label: "Direct & Efficiënt",
    beschrijving: "Kort, to-the-point, handelt zelfstandig",
    personality: { tone: 35, proactivity: 80, autonomy: 75 },
  },
  {
    id: "voorzichtig",
    label: "Voorzichtig & Betrouwbaar",
    beschrijving: "Vraagt altijd bevestiging, maakt geen fouten",
    personality: { tone: 30, proactivity: 40, autonomy: 20 },
  },
];

// ─── Guardrail Options ───────────────────────────────────

const guardrailOptions = [
  "Max €500 uitgeven zonder goedkeuring",
  "Geen contracten wijzigen of opzeggen",
  "Altijd in het Nederlands communiceren",
  "Bevestiging vragen bij externe communicatie",
  "Geen persoonlijke data delen met derden",
  "Dagelijks rapport sturen naar eigenaar",
  "Geen financiële beslissingen zonder goedkeuring",
  "Alleen binnen kantooruren reageren (9-17)",
];

// ─── Component ───────────────────────────────────────────

type Step = "role" | "name" | "personality" | "guardrails" | "deploy";
const allSteps: Step[] = ["role", "name", "personality", "guardrails", "deploy"];

export default function CreateEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [saving, setSaving] = useState(false);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  const [selectedRole, setSelectedRole] = useState<typeof roleTemplates[0] | null>(null);
  const [name, setName] = useState("");
  const [selectedPersonality, setSelectedPersonality] = useState<typeof personalityPresets[0] | null>(null);
  const [selectedGuardrails, setSelectedGuardrails] = useState<string[]>([]);

  useEffect(() => {
    getSkills().then(setAllSkills).catch(() => {});
  }, []);

  const stepIndex = allSteps.indexOf(step);

  const canNext = () => {
    if (step === "role") return selectedRole !== null;
    if (step === "name") return name.trim().length > 0;
    if (step === "personality") return selectedPersonality !== null;
    return true;
  };

  const next = () => {
    const i = allSteps.indexOf(step);
    if (i < allSteps.length - 1) setStep(allSteps[i + 1]!);
  };
  const prev = () => {
    const i = allSteps.indexOf(step);
    if (i > 0) setStep(allSteps[i - 1]!);
  };

  const toggleGuardrail = (g: string) => {
    setSelectedGuardrails((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleDeploy = async () => {
    if (!selectedRole || !selectedPersonality) return;
    setSaving(true);

    try {
      const employee = await createEmployee({
        name,
        role: selectedRole.name,
        avatar: name[0]?.toUpperCase() ?? "?",
        model: "claude-sonnet-4",
        memoryMode: "persistent",
        soulMemory: selectedRole.soulMemory,
        personality: selectedPersonality.personality,
        languages: ["nl"],
        channels: ["dashboard"],
        guardrails: selectedGuardrails.length > 0 ? selectedGuardrails : null,
      });

      // Match skill names to IDs and assign
      for (const skillName of selectedRole.skills) {
        const skill = allSkills.find((s) => s.name === skillName);
        if (skill) await assignSkill(employee.id, skill.id);
      }

      await deployEmployee(employee.id);
      router.push(`/dashboard/${employee.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Terug
      </button>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8">
        {allSteps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIndex ? "bg-primary-900" : "bg-primary-200"}`} />
        ))}
      </div>

      {/* Step: Choose Role */}
      {step === "role" && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary mb-1">Kies een rol</h1>
          <p className="text-sm text-primary-400 mb-6">Selecteer wat je employee moet doen. Skills worden automatisch toegewezen.</p>
          <div className="space-y-2">
            {roleTemplates.map((role) => {
              const Icon = role.icon;
              const selected = selectedRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                    selected ? "border-primary-900 bg-primary-50" : "border-primary-200 bg-white hover:bg-primary-50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-primary-900" : "bg-primary-100"}`}>
                    <Icon size={18} className={selected ? "text-white" : "text-primary-500"} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-primary">{role.name}</p>
                    <p className="text-xs text-primary-400">{role.beschrijving}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {role.skills.map((s) => (
                        <span key={s} className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-500">{s}</span>
                      ))}
                    </div>
                  </div>
                  {selected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-900 shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom option */}
          <div className="mt-4 rounded-xl border border-dashed border-primary-300 bg-white p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles size={14} className="text-accent" />
              <p className="text-sm font-medium text-primary">Iets anders nodig?</p>
            </div>
            <p className="text-xs text-primary-400 mb-3">
              Wij bouwen custom roles en skills op maat voor je business.
            </p>
            <a
              href="mailto:info@vdmnexus.com?subject=Custom AI Employee"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-4 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <MessageSquare size={12} />
              Neem contact op
            </a>
          </div>
        </div>
      )}

      {/* Step: Name */}
      {step === "name" && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary mb-1">Geef je employee een naam</h1>
          <p className="text-sm text-primary-400 mb-6">Dit is hoe je employee zich presenteert.</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Sophie, Max, Nexis..."
            autoFocus
            className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3.5 text-base text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
          />
          {name && (
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-primary-50 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
                {name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{name}</p>
                <p className="text-xs text-primary-400">{selectedRole?.name} Employee</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: Personality */}
      {step === "personality" && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary mb-1">Kies een persoonlijkheid</h1>
          <p className="text-sm text-primary-400 mb-6">Bepaal hoe {name} communiceert.</p>
          <div className="space-y-2">
            {personalityPresets.map((preset) => {
              const selected = selectedPersonality?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPersonality(preset)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                    selected ? "border-primary-900 bg-primary-50" : "border-primary-200 bg-white hover:bg-primary-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-primary">{preset.label}</p>
                    <p className="text-xs text-primary-400">{preset.beschrijving}</p>
                  </div>
                  {selected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-900 shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Guardrails */}
      {step === "guardrails" && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary mb-1">Stel grenzen in</h1>
          <p className="text-sm text-primary-400 mb-6">Kies wat {name} wel en niet mag. Je kunt dit later altijd aanpassen.</p>
          <div className="space-y-1.5">
            {guardrailOptions.map((g) => {
              const selected = selectedGuardrails.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggleGuardrail(g)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected ? "border-primary-900 bg-primary-50" : "border-primary-200 bg-white hover:bg-primary-50"
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    selected ? "border-primary-900 bg-primary-900" : "border-primary-300"
                  }`}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-primary">{g}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-primary-400 mt-3">
            Geen selectie = geen beperkingen. Je kunt guardrails later toevoegen.
          </p>
        </div>
      )}

      {/* Step: Deploy */}
      {step === "deploy" && selectedRole && selectedPersonality && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary mb-1">Klaar om te deployen</h1>
          <p className="text-sm text-primary-400 mb-6">Controleer de configuratie en zet {name} aan het werk.</p>
          <div className="rounded-xl border border-primary-200 bg-white divide-y divide-primary-100">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
                {name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-primary">{name}</p>
                <p className="text-xs text-primary-400">{selectedRole.name} · {selectedPersonality.label}</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-primary-400 mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1">
                {selectedRole.skills.map((s) => (
                  <span key={s} className="flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {selectedGuardrails.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs text-primary-400 mb-1.5">Guardrails</p>
                <div className="space-y-1">
                  {selectedGuardrails.map((g) => (
                    <div key={g} className="flex items-center gap-2 text-xs text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-primary-400">Model</span>
              <span className="font-medium text-primary">Claude Sonnet 4</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-primary-400">Geheugen</span>
              <span className="font-medium text-primary">Persistent + Context</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        {stepIndex > 0 ? (
          <button onClick={prev} className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary transition-colors">
            <ArrowLeft size={15} />
            Vorige
          </button>
        ) : (
          <div />
        )}

        {step === "deploy" ? (
          <button
            onClick={handleDeploy}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary-900 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Check size={15} />
                Deploy {name}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={next}
            disabled={!canNext()}
            className="flex items-center gap-1.5 rounded-xl bg-primary-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 transition-colors disabled:opacity-30"
          >
            Volgende
          </button>
        )}
      </div>
    </div>
  );
}
