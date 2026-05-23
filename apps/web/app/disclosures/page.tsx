import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { launchLive } from "@/lib/launch-flag";

export const metadata: Metadata = {
  title: "Disclosures — VDM Nexus / $NEXUS",
  description:
    "$NEXUS token risk factors, issuer disclosures, and MiCA-aware operator notice for the VDM Nexus signed-inference rail. Plain prose, no marketing.",
  alternates: { canonical: "https://vdmnexus.com/disclosures" },
  robots: { index: true, follow: true },
};

export default function DisclosuresPage() {
  if (!launchLive()) notFound();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:pt-20">
        <header className="border-b border-soft pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            Disclosures
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            $NEXUS — risk factors and issuer disclosures
          </h1>
          <p className="mt-4 text-sm text-text-muted">
            Read this before you interact with $NEXUS in any way. Not
            financial advice. Not legal advice. Not a solicitation.
            $NEXUS can lose its entire value.
          </p>
        </header>

        <div className="space-y-12 pt-10 text-[15px] leading-relaxed text-text-muted">
          <Section title="Issuer">
            <p>
              VDM Nexus is operated by a Spain-resident{" "}
              <span className="text-text">autónomo</span> (self-employed
              natural person, registered with the Agencia Tributaria
              and Spanish Social Security). The operator is{" "}
              <span className="text-text">not a legal person</span>{" "}
              under Spanish law — there is no SL (Sociedad Limitada),
              no SA, and no separate corporate vehicle as of
              publication. The CNMV (Comisión Nacional del Mercado de
              Valores) is the relevant supervisor under MiCA (EU
              Regulation 2023/1114) and Spanish Royal Decree-Law
              7/2024. Spain's MiCA transitional regime ended on{" "}
              <span className="text-text">30 December 2025</span> —
              CNMV enforcement is active.
            </p>
            <p>
              The protocol code is open-source under MIT
              (github.com/vdmnexus/vdmnexus). The website, packages,
              and operational infrastructure are maintained by the
              autónomo. A legal-entity structure (Spanish SL or partner
              foundation) may be formed before or after token launch;
              status will be disclosed on this page when finalized.
            </p>
          </Section>

          <Section title="$NEXUS token disclosures">
            <ul className="ml-5 list-disc space-y-2.5 marker:text-text-muted">
              <li>
                <span className="text-text">Total supply:</span>{" "}
                100,000,000,000 $NEXUS, fixed forever. Mint authority
                disabled at deploy.
              </li>
              <li>
                <span className="text-text">Launch venue:</span>{" "}
                pump.fun with USDC pair on Solana mainnet. SPL token
                on Solana. Dollar-denominated MCAP (no SOL beta).
              </li>
              <li>
                <span className="text-text">Allocation:</span> 70%
                liquidity pool (LP burned at pump.fun bonding
                completion), 15% treasury vault (Squads multisig, 90d
                lockup + 12mo linear vest), 10% retroactive airdrop
                (non-spendable Squads, criteria within 90d, 6mo
                distribution vest), 5% community pool (publicly tracked
                Squads multisig, no lockup).
              </li>
              <li>
                <span className="text-text">Team allocation:</span>{" "}
                None. No presale, no insider rounds, no vesting bypass,
                no configurable distribution path. The deployer wallet
                does not hold a team allocation.
              </li>
              <li>
                <span className="text-text">Utility wires:</span>{" "}
                Disclosed on a dated 0/30/60/90 calendar on{" "}
                <Link
                  href="/whitepaper"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /whitepaper
                </Link>{" "}
                Section 03. Final structure of Wires 3 (reputation
                bond) and Wire 4 (verifier staking + revenue share) is
                subject to a Spanish legal scoping memo under ESMA
                March 2025 Guidelines on the qualification of
                crypto-assets as financial instruments and CNMV MiCA
                Q&A. Wires 3-4 may be restructured, replaced with
                non-yielding alternatives (e.g. soulbound reputation
                tokens), or deferred if scoping finds CASP
                authorization or MiFID II exposure.
              </li>
              <li>
                <span className="text-text">Squads addresses:</span>{" "}
                Published 24-48 hours before launch. Verifiable on
                Solscan and Bubblemaps Solana as three distinct
                allocations, not as a clustered wallet.
              </li>
            </ul>
          </Section>

          <Section title="$NEXUS is NOT">
            <ul className="ml-5 list-disc space-y-2.5 marker:text-text-muted">
              <li>
                <span className="text-text">Not a security</span> —
                not an investment contract, not a profit-share, not a
                revenue claim, not a share certificate. No return is
                promised, implied, or guaranteed.
              </li>
              <li>
                <span className="text-text">
                  Not a regulated financial instrument
                </span>{" "}
                under MiFID II Annex I, to the best of the issuer's
                current understanding, pending the legal scoping memo.
              </li>
              <li>
                <span className="text-text">Not a governance token</span>{" "}
                — no voting rights, no governance authority over the
                protocol or any related entity.
              </li>
              <li>
                <span className="text-text">Not insured, not custodied
                by Nexus</span> — holders self-custody. There is no
                FDIC, FSCS, Fondo de Garantía de Inversiones, or
                equivalent protection.
              </li>
              <li>
                <span className="text-text">Not available, intended,
                or marketed</span> in jurisdictions where the offer
                would be unlawful — including but not limited to
                restricted persons under applicable EU, UK, US, or
                other regulations.
              </li>
              <li>
                <span className="text-text">Not financial advice.</span>{" "}
                Nothing on this site or in the whitepaper is a
                solicitation, recommendation, or guarantee of any
                outcome.
              </li>
            </ul>
          </Section>

          <Section title="Risk factors">
            <p>
              The following risks are not exhaustive. Read carefully.
              Participate only with funds you can lose without
              consequence, and only where it is lawful for you to do so.
            </p>
            <ul className="ml-5 list-disc space-y-2.5 marker:text-text-muted">
              <li>
                <span className="text-text">Beta protocol.</span> No
                third-party security audit has been performed at time
                of publication. No SLA, no SOC 2, no ISO 27001. The
                API surface is stable; the operational rail is mainnet
                live; v1 ships at $NEXUS launch. Bugs, downtime, and
                unexpected behavior are possible.
              </li>
              <li>
                <span className="text-text">Solo founder, single
                point of failure.</span> One Spain-resident autónomo
                operates the rail, the marketing, the legal
                compliance, and the support. Incapacitation, illness,
                or operator absence may pause development indefinitely.
              </li>
              <li>
                <span className="text-text">Regulatory risk.</span>{" "}
                CNMV may issue public warnings against the issuer,
                the token, or related activities. MiCA enforcement is
                active in Spain since 30 December 2025. EU AI Act
                Article 12 (extended to 2 December 2027) and other
                applicable regulations may shape what wires can be
                shipped and in what form. ESMA may publish guidance
                that reclassifies $NEXUS as a financial instrument
                even after launch.
              </li>
              <li>
                <span className="text-text">Smart contract risk.</span>{" "}
                The pump.fun pool, the Squads vesting program, the
                future bond contract (Wire 3), and the future
                verifier-staking contract (Wire 4) are smart
                contracts. Smart contracts can have bugs, can be
                exploited, and can fail in ways that result in
                permanent loss of tokens or funds.
              </li>
              <li>
                <span className="text-text">Liquidity risk.</span>{" "}
                pump.fun pre-bonding markets are thin. Post-bonding
                liquidity is subject to traded volume on Solana DEX
                infrastructure. Slippage on size can be high. Exits
                may not be available at expected prices.
              </li>
              <li>
                <span className="text-text">Volatility risk.</span>{" "}
                Fair-launch tokens are volatile. Infrastructure tokens
                are doubly so. Price movements of 50% or more in a
                single day are common and possible.
              </li>
              <li>
                <span className="text-text">Wire-ship risk.</span>{" "}
                Wires 2, 3, 4 are commitments with timelines, not
                shipped features. Each may slip, be restructured, or
                be deferred indefinitely based on legal scoping,
                engineering capacity, or market conditions. Status of
                each wire will be disclosed on{" "}
                <Link
                  href="/roadmap"
                  className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
                >
                  /roadmap
                </Link>{" "}
                in public.
              </li>
              <li>
                <span className="text-text">Total-loss risk.</span>{" "}
                $NEXUS can lose its entire value. Treat any allocation
                as fully at risk.
              </li>
            </ul>
          </Section>

          <Section title="Beta status">
            <p>
              The signed-inference rail (nexus.vdmnexus.com,
              packages, SDKs, verifier) is in{" "}
              <span className="text-text">Beta</span>. v1 ships at
              $NEXUS launch. Beta means: API surface stable, mainnet
              live since 2026-05-21, no SLA, no paid support tier, no
              external audit. Beta status is disclosed visually on
              every public surface. See{" "}
              <Link
                href="/security"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                /security
              </Link>{" "}
              for security architecture and responsible disclosure
              contact.
            </p>
          </Section>

          <Section title="Reference">
            <p className="text-sm">
              <Link
                href="/whitepaper"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                /whitepaper
              </Link>
              {" · "}
              <Link
                href="/token"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                /token
              </Link>
              {" · "}
              <Link
                href="/security"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                /security
              </Link>
              {" · "}
              <Link
                href="/roadmap"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                /roadmap
              </Link>
              {" · "}
              <a
                href="https://github.com/vdmnexus/vdmnexus"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-text-muted/40 underline-offset-4 transition-colors hover:text-text hover:decoration-text"
              >
                github.com/vdmnexus/vdmnexus
              </a>
            </p>
            <p className="mt-4 text-xs text-text-muted/70">
              Last updated at deploy. This page is the canonical
              disclosure surface for $NEXUS and the VDM Nexus rail;
              changes are versioned in git.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-text">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
