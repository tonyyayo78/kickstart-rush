import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
      <header className="border-b border-zinc-200 bg-white px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/public/fixtures" className="hover:opacity-80 transition-opacity">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Football Club Barbados"
              width={160}
              height={84}
              priority
            />
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="flex items-center gap-4 sm:gap-6 text-sm">
              <Link href="/public/fixtures" className="font-bold uppercase tracking-wide text-zinc-600 hover:text-blue-600 transition-colors">
                Fixtures
              </Link>
              <Link href="/public/results" className="font-bold uppercase tracking-wide text-zinc-600 hover:text-blue-600 transition-colors">
                Results
              </Link>
              <Link href="/public/standings" className="font-bold uppercase tracking-wide text-zinc-600 hover:text-blue-600 transition-colors">
                Standings
              </Link>
            </nav>
            <Link
              href="/sign-in"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-blue-700"
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
