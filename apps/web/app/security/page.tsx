import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GridBg } from "@/components/grid-bg";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
} from "@/components/section";
import { Card } from "@/components/card";
import { FadeIn } from "@/components/fade-in";

export const metadata: Metadata = {
  title: "Security — VDM Nexus",
  description:
    "Beta-stage security architecture for the VDM Nexus signed-inference rail. AWS KMS-backed Ed25519 signing, five-check receipt verification, mainnet kill switch + price cap + allowlist, idempotent settlement ledger. No third-party audit at Beta. Responsible disclosure to security@vdmnexus.com.",
  alternates: { canonical: "https://vdmnexus.com/security" },
  openGraph: {
    title: "Security — VDM Nexus",
    description:
      "Beta-stage security architecture for the signed-inference rail. Honest, not aspirational.",
    url: "https://vdmnexus.com/security",
    siteName: "VDM Nexus",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const SHIPPED: Array<{ title: string; body: string }> = [
  {
    title: "AWS KMS Ed25519 signing",
    body:
      "The facilitator signing key is held by AWS KMS as an Ed25519 (ECC_NIST_EDWARDS25519) key. KMS.Sign with ED25519_SHA_512 is invoked per request — the private key never enters lambda memory. The deployed KMS-derived public key is asserted equal to NEXUS_DEPOSIT_ADDRESS at boot or the service fails closed.",
  },
  {
    title: "Receipt signing (Ed25519, canonical JSON)",
    body:
      "Every signed inference receipt is canonicalized (sorted keys, no whitespace, excluding nexus_signature) and signed by the Nexus operator Ed25519 key. Operator public key is published at GET /api/v1/operator-key. Verifiers — including verify.vdmnexus.com and @vdm-nexus/x402 — check signatures against this key independently of the operator.",
  },
  {
    title: "Five-check verification",
    body:
      "Every receipt is verifiable end-to-end via five independent checks: prompt-hash match, response-hash match, Ed25519 operator signature, on-chain USDC settlement landed at the recipient, payer pubkey matches receipt.agent_pubkey. The same code path runs in the SDK and in the hosted verifier — no operator-controlled verification surface.",
  },
  {
    title: "Mainnet kill switch + spend cap + allowlist",
    body:
      "Operationally-critical fail-safes: NEXUS_MAINNET_ENABLED='false' makes all mainnet paid routes return 503 instantly (testnets stay reachable). NEXUS_MAX_PRICE_USDC is a hard ceiling on the challenge price — the issuer 500s closed if X402_FLAT_PRICE_USDC exceeds it. NEXUS_ALLOWED_AGENTS is a comma-separated allowlist of payer pubkeys; non-listed payers 403 with structured logs.",
  },
  {
    title: "Append-only ledger + idempotent settlement",
    body:
      "credits_ledger and burn_pool_ledger are append-only deltas with a unique index on (tx_signature) — repeated scans or replayed transactions never double-credit. Nonce table prevents request replay within the 30-second timestamp window. Server-side service-role writes only; RLS denies anon-key writes everywhere.",
  },
  {
    title: "Upstash sliding-window rate limit",
    body:
      "30 requests/minute per IP on chat-completions, 100/minute per agent pubkey on both paid routes. Backed by Upstash Redis (or Vercel Marketplace KV) with sliding-window semantics. 429 responses carry X-RateLimit-* headers. Missing config fails open with a single warn log — chosen over fail-closed at Beta to avoid silent outage during config drift; v1 may revert this.",
  },
];

const GAPS: Array<{ title: string; body: string }> = [
  {
    title: "No third-party security audit",
    body:
      "No external paid audit has been performed at time of publication. Code is open-source under MIT at github.com/vdmnexus/vdmnexus; public review is encouraged. An Immunefi bounty and a third-party audit are on the post-launch roadmap, gated on revenue. Do not assume any code review beyond what a public repo earns.",
  },
  {
    title: "No SLA at Beta",
    body:
      "There is no SLA, no uptime commitment, no incident-response time guarantee, and no paid support tier during Beta. v1 (shipping at $NEXUS launch) introduces a Business tier with SLA, incident response, and dedicated support.",
  },
  {
    title: "No SOC 2 / ISO 27001 / formal compliance attestation",
    body:
      "No formal compliance attestations exist. The rail is appropriate for builders, hobbyists, and self-serve agent operators. Regulated-industry buyers should wait for v1 (compliance-export feature) or contact the operator directly to scope a custom evaluation.",
  },
  {
    title: "Solo founder, single point of failure",
    body:
      "One Spain-resident autónomo operates the rail, the deployments, the security response, and the development. Incapacitation, illness, or operator absence may pause incident response and feature work indefinitely. Critical infrastructure (KMS, Squads multisigs, Supabase, Vercel team) is recoverable by the operator only at Beta — disaster-recovery delegation is part of v1 scope.",
  },
];

const THREAT_ROWS: Array<{ trust: string; out: string }> = [
  {
    trust:
      "Operator is trusted for receipt integrity. The receipt is signed by the Nexus KMS key; if the operator is compromised, signed receipts can be forged.",
    out:
      "Model output correctness (hallucinations, factual errors) is out of scope. Signed inference proves what was returned, not whether it was true.",
  },
  {
    trust:
      "On-chain settlement is trusted for payment finality. Solana / Base finality assumptions apply. Reorgs at the block level can in principle invalidate a settlement, though practical risk is near-zero post-finality.",
    out:
      "Downstream agent behavior — what an agent does with the response — is out of scope. The receipt proves the inference happened; consequences belong to the agent's runtime.",
  },
  {
    trust:
      "Verifier code is trusted at point of use. The SDK and the hosted verifier run identical verification logic; an attacker controlling the verifier process could lie about a check result.",
    out:
      "Network-level censorship of inference endpoints (DNS blocks, ISP filtering) is out of scope. Use direct IP or alternate domains if you're in a restricted environment.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden">
          <GridBg />
          <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-20 sm:pb-20 sm:pt-28">
            <FadeIn>
              <SectionEyebrow>Security</SectionEyebrow>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-text sm:text-5xl">
                Beta-stage security architecture. Honest, not aspirational.
              </h1>
              <p className="mt-6 text-base leading-relaxed text-text-muted sm:text-lg">
                What we ship today, what we explicitly don't, what the
                trust assumptions are, and how to reach the operator
                with a vulnerability. v1 ships at $NEXUS launch — the
                gaps below are post-launch roadmap items, not denial.
              </p>
            </FadeIn>
          </div>
        </section>

        <Section className="pt-0">
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>What ships today</SectionEyebrow>
            <SectionHeading className="mt-4">
              The cryptographic spine.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Every primitive below is in production on mainnet since
              2026-05-21. Each can be inspected in the open-source
              code at{" "}
              <a
                href="https://github.com/vdmnexus/vdmnexus"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                github.com/vdmnexus/vdmnexus
              </a>
              .
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {SHIPPED.map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.04}>
                <Card className="h-full">
                  <h3 className="text-base font-semibold text-text">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {s.body}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>What's missing</SectionEyebrow>
            <SectionHeading className="mt-4">
              Beta means we don't have these yet.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Stated plainly. The absence of these is a Beta-stage
              tradeoff, not an oversight. Each lands as Nexus matures
              past v1.
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {GAPS.map((g, i) => (
              <FadeIn key={g.title} delay={i * 0.06}>
                <Card className="h-full">
                  <h3 className="text-base font-semibold text-text">
                    {g.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {g.body}
                  </p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Section>
          <FadeIn className="max-w-2xl">
            <SectionEyebrow>Threat model</SectionEyebrow>
            <SectionHeading className="mt-4">
              What we promise to defend; what we don't.
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-text-muted">
              Three rows: trust assumptions on the left, out-of-scope
              on the right. The signed receipt is the cryptographic
              boundary — everything inside is defended; everything
              outside is the caller's responsibility.
            </p>
          </FadeIn>
          <FadeIn className="mt-10">
            <div className="overflow-hidden rounded-2xl border border-soft bg-surface/60 backdrop-blur">
              <div className="grid grid-cols-1 divide-y divide-soft md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="px-6 py-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                    Trust assumption
                  </h3>
                </div>
                <div className="px-6 py-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                    Out of scope
                  </h3>
                </div>
                {THREAT_ROWS.map((row, i) => (
                  <div
                    key={i}
                    className="contents"
                  >
                    <div className="border-t border-soft px-6 py-4 text-sm leading-relaxed text-text-muted">
                      {row.trust}
                    </div>
                    <div className="border-t border-soft px-6 py-4 text-sm leading-relaxed text-text-muted">
                      {row.out}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </Section>

        <Section>
          <FadeIn className="max-w-3xl">
            <SectionEyebrow>Responsible disclosure</SectionEyebrow>
            <SectionHeading className="mt-4">
              Find a vulnerability? Tell us first.
            </SectionHeading>
          </FadeIn>
          <FadeIn className="mt-10">
            <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur sm:p-10">
              <p className="text-base leading-relaxed text-text-muted">
                Email{" "}
                <a
                  href="mailto:security@vdmnexus.com"
                  className="font-mono text-text underline decoration-text-muted/40 underline-offset-4 transition-colors hover:decoration-text"
                >
                  security@vdmnexus.com
                </a>
                {" "}with reproduction steps and the impact you've
                observed. The operator will acknowledge within 72
                hours, work toward a fix, and publish a coordinated
                disclosure within 90 days of acknowledgment unless the
                issue is actively exploited (then sooner).
              </p>
              <p className="mt-4 text-base leading-relaxed text-text-muted">
                There is no paid bug bounty at Beta. Public credit on{" "}
                <Link
                  href="/roadmap"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /roadmap
                </Link>
                {" "}and a permanent ack in the security advisory is
                the only available recognition. An Immunefi bounty is
                on the post-launch roadmap, gated on revenue.
              </p>
              <ul className="ml-5 mt-6 list-disc space-y-2 text-sm text-text-muted marker:text-text-muted">
                <li>
                  <span className="text-text">Do</span> report quietly
                  to the email above. Provide PoC and impact analysis.
                </li>
                <li>
                  <span className="text-text">Do not</span> exploit
                  beyond what's needed to prove the bug. Do not exfil
                  data, do not move funds, do not disrupt the rail.
                </li>
                <li>
                  <span className="text-text">Do not</span> publish
                  before coordinated disclosure. We work in good faith
                  with anyone who works in good faith with us.
                </li>
              </ul>
            </div>
          </FadeIn>
        </Section>

        <Section className="pb-24">
          <FadeIn>
            <div className="rounded-2xl border border-soft bg-surface/60 p-8 backdrop-blur">
              <p className="text-xs text-text-muted">
                See also:{" "}
                <Link
                  href="/disclosures"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /disclosures
                </Link>
                {" "}(token + protocol legal disclosures, MiCA-aware
                issuer notice),{" "}
                <Link
                  href="/whitepaper"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /whitepaper
                </Link>
                {" "}(protocol architecture and token role),{" "}
                <a
                  href="https://docs.vdmnexus.com/docs/spec/sir-v2"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  SIR v2 spec
                </a>
                {" "}(receipt format and verification).
              </p>
            </div>
          </FadeIn>
        </Section>
      </main>
      <Footer />
    </>
  );
}
