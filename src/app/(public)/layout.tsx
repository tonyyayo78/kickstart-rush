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
      <header className="border-b border-black/10 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/public/fixtures" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Football Club Barbados"
              width={180}
              height={56}
              priority
            />
            <span className="hidden sm:inline text-3xl font-bold tracking-tight uppercase">
              Kickstart Rush
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/public/fixtures" className="hover:text-black/60 transition-colors">
                Fixtures
              </Link>
              <Link href="/public/results" className="hover:text-black/60 transition-colors">
                Results
              </Link>
              <Link href="/public/standings" className="hover:text-black/60 transition-colors">
                Standings
              </Link>
            </nav>
            <Link
              href="/sign-in"
              className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5"
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
