"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { createEmployee, getSkills, assignSkill, deployEmployee, type Skill } from "../../../lib/api";
import { useEffect } from "react";

type Step = "identity" | "personality" | "model" | "skills" | "guardrails" | "review";
const steps: Step[] = ["identity", "personality", "model", "skills", "guardrails", "review"];
const stepLabels: Record<Step, string> = {
  identity: "Identiteit",
  personality: "Persoonlijkheid",
  model: "Model & Geheugen",
  skills: "Skills",
  guardrails: "Guardrails",
  review: "Review & Deploy",
};

export default function CreateEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [saving, setSaving] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [soulMemory, setSoulMemory] = useState("");
  const [tone, setTone] = useState(35);
  const [proactivity, setProactivity] = useState(70);
  const [autonomy, setAutonomy] = useState(50);
  const [languages, setLanguages] = useState<string[]>(["nl"]);
  const [model, setModel] = useState("claude-sonnet-4");
  const [memoryMode, setMemoryMode] = useState("persistent");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [guardrails, setGuardrails] = useState<string[]>([]);
  const [newGuardrail, setNewGuardrail] = useState("");

  useEffect(() => {
    getSkills().then(setAvailableSkills).catch(() => {});
  }, []);

  const stepIndex = steps.indexOf(step);
  const canNext = step === "identity" ? name.trim().length > 0 : true;

  const next = () => {
    const i = steps.indexOf(step);
    if (i < steps.length - 1) setStep(steps[i + 1]!);
  };
  const prev = () => {
    const i = steps.indexOf(step);
    if (i > 0) setStep(steps[i - 1]!);
  };

  const handleDeploy = async () => {
    setSaving(true);
    try {
      const employee = await createEmployee({
        name,
        role: role || null,
        avatar: name[0]?.toUpperCase() ?? "?",
        model,
        memoryMode,
        soulMemory: soulMemory || null,
        personality: { tone, proactivity, autonomy },
        languages,
        channels: ["dashboard"],
        guardrails: guardrails.length > 0 ? guardrails : null,
      });

      // Assign skills
      for (const skillId of selectedSkills) {
        await assignSkill(employee.id, skillId);
      }

      // Deploy
      await deployEmployee(employee.id);

      router.push(`/dashboard/${employee.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const toggleLang = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const addGuardrail = () => {
    if (newGuardrail.trim()) {
      setGuardrails((prev) => [...prev, newGuardrail.trim()]);
      setNewGuardrail("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Terug
      </button>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= stepIndex ? "bg-primary-900" : "bg-primary-200"
            }`}
          />
        ))}
      </div>

      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
          Stap {stepIndex + 1} van {steps.length}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-primary mt-1">
          {stepLabels[step]}
        </h1>
      </div>

      {/* Steps */}
      <div className="mt-6 space-y-4">
        {step === "identity" && (
          <>
            <div>
              <label className="text-xs font-medium text-primary-500 mb-1 block">Naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Sophie, Max, Receptie..."
                className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary-500 mb-1 block">Rol</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Bijv. Vastgoedbeheer, Klantenservice..."
                className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary-500 mb-1 block">Soul Memory</label>
              <textarea
                value={soulMemory}
                onChange={(e) => setSoulMemory(e.target.value)}
                rows={4}
                placeholder="Beschrijf wie deze employee is. Persoonlijkheid, kennis, context..."
                className="w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary-500 mb-1.5 block">Taal</label>
              <div className="flex gap-2">
                {["nl", "en", "de", "fr", "es"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => toggleLang(lang)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      languages.includes(lang)
                        ? "bg-primary-900 text-white"
                        : "bg-primary-100 text-primary-500 hover:bg-primary-200"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "personality" && (
          <>
            <p className="text-sm text-primary-400 mb-4">
              Bepaal hoe je employee communiceert en handelt.
            </p>
            {[
              { label: "Communicatiestijl", left: "Formeel", right: "Informeel", value: tone, set: setTone },
              { label: "Initiatief", left: "Reactief", right: "Proactief", value: proactivity, set: setProactivity },
              { label: "Zelfstandigheid", left: "Vraagt altijd", right: "Autonoom", value: autonomy, set: setAutonomy },
            ].map((s) => (
              <div key={s.label}>
                <label className="text-xs font-medium text-primary-500 mb-2 block">{s.label}</label>
                <div className="flex justify-between text-[11px] text-primary-400 mb-1">
                  <span>{s.left}</span>
                  <span>{s.right}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            ))}
          </>
        )}

        {step === "model" && (
          <>
            <div>
              <label className="text-xs font-medium text-primary-500 mb-1.5 block">LLM Model</label>
              <div className="space-y-2">
                {[
                  { id: "claude-sonnet-4", label: "Claude Sonnet 4", desc: "Snel en slim — beste prijs/kwaliteit" },
                  { id: "claude-haiku-4", label: "Claude Haiku 4.5", desc: "Snelst — voor eenvoudige taken" },
                  { id: "claude-opus-4", label: "Claude Opus 4", desc: "Meest capable — voor complexe taken" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                      model === m.id
                        ? "border-primary-900 bg-primary-50"
                        : "border-primary-200 bg-white hover:bg-primary-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{m.label}</p>
                      <p className="text-xs text-primary-400">{m.desc}</p>
                    </div>
                    {model === m.id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-900">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-primary-500 mb-1.5 block">Geheugen</label>
              <div className="space-y-2">
                {[
                  { id: "persistent", label: "Persistent + Context", desc: "Onthoudt alles tussen sessies" },
                  { id: "session", label: "Alleen sessie", desc: "Vergeet na elk gesprek" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMemoryMode(m.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                      memoryMode === m.id
                        ? "border-primary-900 bg-primary-50"
                        : "border-primary-200 bg-white hover:bg-primary-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{m.label}</p>
                      <p className="text-xs text-primary-400">{m.desc}</p>
                    </div>
                    {memoryMode === m.id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-900">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "skills" && (
          <>
            <p className="text-sm text-primary-400 mb-2">
              Kies welke skills je employee krijgt.
            </p>
            <div className="space-y-2">
              {availableSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                    selectedSkills.includes(skill.id)
                      ? "border-accent bg-accent/5"
                      : "border-primary-200 bg-white hover:bg-primary-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-primary">{skill.name}</p>
                    <p className="text-xs text-primary-400">{skill.description}</p>
                  </div>
                  {selectedSkills.includes(skill.id) && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "guardrails" && (
          <>
            <p className="text-sm text-primary-400 mb-2">
              Stel grenzen in voor wat je employee mag doen.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGuardrail}
                onChange={(e) => setNewGuardrail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGuardrail()}
                placeholder="Bijv. Max €500 zonder goedkeuring"
                className="flex-1 rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
              />
              <button
                onClick={addGuardrail}
                className="rounded-xl bg-primary-900 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
              >
                Toevoegen
              </button>
            </div>
            {guardrails.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {guardrails.map((g, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-primary-200 bg-white px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="text-sm text-primary">{g}</span>
                    </div>
                    <button
                      onClick={() => setGuardrails((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-primary-400 hover:text-red-500 transition-colors"
                    >
                      Verwijder
                    </button>
                  </div>
                ))}
              </div>
            )}
            {guardrails.length === 0 && (
              <p className="text-xs text-primary-400 mt-2">
                Geen guardrails — je employee heeft volledige vrijheid. Je kunt deze stap overslaan.
              </p>
            )}
          </>
        )}

        {step === "review" && (
          <>
            <div className="rounded-xl border border-primary-200 bg-white divide-y divide-primary-100">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
                  {name[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-base font-semibold text-primary">{name}</p>
                  <p className="text-xs text-primary-400">{role || "Geen rol"}</p>
                </div>
              </div>
              {[
                { label: "Model", value: model },
                { label: "Geheugen", value: memoryMode === "persistent" ? "Persistent + Context" : "Alleen sessie" },
                { label: "Talen", value: languages.map((l) => l.toUpperCase()).join(", ") },
                { label: "Skills", value: selectedSkills.length > 0 ? `${selectedSkills.length} geselecteerd` : "Geen" },
                { label: "Guardrails", value: guardrails.length > 0 ? `${guardrails.length} ingesteld` : "Geen" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-4 py-3">
                  <span className="text-sm text-primary-400">{row.label}</span>
                  <span className="text-sm font-medium text-primary">{row.value}</span>
                </div>
              ))}
              {soulMemory && (
                <div className="px-4 py-3">
                  <p className="text-xs text-primary-400 mb-1">Soul Memory</p>
                  <p className="text-sm text-primary leading-relaxed">{soulMemory}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

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

        {step === "review" ? (
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
                Deploy Employee
              </>
            )}
          </button>
        ) : (
          <button
            onClick={next}
            disabled={!canNext}
            className="flex items-center gap-1.5 rounded-xl bg-primary-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            Volgende
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
