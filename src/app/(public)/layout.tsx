import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/public/fixtures" className="hover:opacity-80 transition-opacity shrink-0">
            <Logo className="h-10 md:h-12" priority />
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="flex items-center gap-4 sm:gap-6 text-sm">
              <Link href="/public/fixtures" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
                Fixtures
              </Link>
              <Link href="/public/results" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
                Results
              </Link>
              <Link href="/public/standings" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
                Standings
              </Link>
            </nav>
            <Link
              href="/sign-in"
              className="rounded bg-[#00267F] border-t border-t-[#3349A3] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
