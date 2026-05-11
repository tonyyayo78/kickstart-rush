import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Kickstart Rush</h1>
      <nav className="flex gap-4">
        <Link
          href="/public/fixtures"
          className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
        >
          Public site
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
        >
          Sign in
        </Link>
      </nav>
    </main>
  );
}
