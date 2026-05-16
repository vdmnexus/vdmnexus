import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Params) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin")
    ? sp.next
    : "/admin/roadmap";

  if (await isAdmin()) redirect(next);

  return (
    <main className="relative min-h-screen">
      <Nav />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 pt-24">
        <header>
          <h1 className="text-2xl font-semibold text-text">Admin</h1>
          <p className="mt-1 text-sm text-text-muted">
            Protected area. Sign in to edit the roadmap and build log.
          </p>
        </header>
        <div className="rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
