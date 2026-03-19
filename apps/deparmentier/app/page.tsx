import { Hero } from "./_components/hero";
import { AgentDemos } from "./_components/agent-demos";
import { CtaSection } from "./_components/cta-section";
import { Footer } from "./_components/footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <AgentDemos />
      <CtaSection />
      <Footer />
    </main>
  );
}
