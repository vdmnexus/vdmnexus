import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";
import { ProblemSolution } from "./_components/problem-solution";
import { Features } from "./_components/features";
import { Pricing } from "./_components/pricing";
import { WaitlistForm } from "./_components/waitlist-form";
import { SocialProof } from "./_components/social-proof";
import { Footer } from "./_components/footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Features />
      <SocialProof />
      <Pricing />
      <section id="waitlist" className="py-24 bg-primary-100">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-primary mb-4 tracking-tight">
            Bouw je eerste AI employee
          </h2>
          <p className="text-primary-500 mb-8">
            Meld je aan en krijg als eerste toegang tot het platform.
          </p>
          <WaitlistForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}
