import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card shadow-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 md:px-6">
          <Link href="/public/fixtures" className="hover:opacity-80 transition-opacity shrink-0">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Rush Football Club"
              width={200}
              height={105}
              className="h-8 w-auto"
              priority
              unoptimized
            />
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/public/fixtures" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                Fixtures
              </Link>
              <Link href="/public/results" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                Results
              </Link>
              <Link href="/public/standings" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                Standings
              </Link>
            </nav>
            <ThemeToggle size="sm" />
            <Link
              href="/sign-in"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-gradient-to-br hover:from-primary hover:to-[hsl(219_70%_30%)] active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6 animate-in fade-in duration-300">{children}</main>
    </div>
  );
}
