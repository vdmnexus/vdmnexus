import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-8 px-6 py-24">
      <span className="rounded-full border border-fd-border bg-fd-muted/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-fd-muted-foreground">
        Documentation
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
        Signed inference for AI agents.
      </h1>
      <p className="max-w-2xl text-balance text-base text-fd-muted-foreground sm:text-lg">
        Inference call + on-chain payment + a cryptographic receipt of exactly
        what the model returned. Open-source SDKs for the Ed25519 prepaid flow
        and the x402 pay-per-call flow.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/docs/introduction"
          className="rounded-md border border-fd-primary/60 bg-fd-primary/20 px-5 py-3 text-sm font-medium text-fd-foreground transition-colors hover:border-fd-primary hover:bg-fd-primary/30"
        >
          Start the docs →
        </Link>
        <Link
          href="/docs/quickstart"
          className="rounded-md border border-fd-border bg-fd-muted/60 px-5 py-3 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/60 hover:text-fd-foreground"
        >
          Quickstart
        </Link>
      </div>
      <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
        <Card
          title="@vdm-nexus/sdk"
          body="Lean Ed25519-signed prepaid flow. Two runtime deps."
          href="/docs/sdk/sdk-reference"
        />
        <Card
          title="@vdm-nexus/x402"
          body="Pay-per-call inference via x402 on Solana."
          href="/docs/sdk/x402-reference"
        />
        <Card
          title="Self-host"
          body="Run your own facilitator with @x402/svm."
          href="/docs/ops/self-host-facilitator"
        />
      </div>
    </main>
  );
}

function Card(props: { title: string; body: string; href: string }) {
  return (
    <Link
      href={props.href}
      className="block rounded-xl border border-fd-border bg-fd-muted/40 p-5 transition-colors hover:border-fd-primary/50"
    >
      <h3 className="font-mono text-sm font-semibold text-fd-foreground">
        {props.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
        {props.body}
      </p>
    </Link>
  );
}
