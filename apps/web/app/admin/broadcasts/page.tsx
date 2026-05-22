import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { BroadcastsView } from "@/components/admin/broadcasts-view";
import { isAdmin } from "@/lib/admin-auth";
import { listBroadcasts } from "@/lib/broadcasts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminBroadcastsPage() {
  if (!(await isAdmin())) {
    redirect("/admin/login?next=/admin/broadcasts");
  }

  const broadcasts = await listBroadcasts();

  return (
    <main className="relative min-h-screen">
      <Nav />
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              Admin
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
              Broadcasts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
              Every broadcast draft authored in{" "}
              <code className="rounded bg-bg px-1.5 py-0.5 text-text">
                marketing/broadcasts/
              </code>{" "}
              renders here, one card per ship. Tab through the platforms,
              copy to clipboard, or open the X intent URL. The repo stays the
              source of truth — edits happen via git, not this page.
            </p>
          </div>
          <SignOutButton />
        </header>

        <BroadcastsView broadcasts={broadcasts} />
      </section>
    </main>
  );
}
