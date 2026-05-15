import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {/* Subtle radial gradient behind card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top, hsl(var(--primary) / 0.06), transparent 55%)",
        }}
      />

      {/* Theme toggle top-right */}
      <div className="absolute right-4 top-4">
        <ThemeToggle size="sm" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <a href="/public/standings">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Football Club Barbados"
              width={200}
              height={105}
              className="h-12 w-auto"
              priority
              unoptimized
            />
          </a>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Welcome Back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to Kickstart Rush</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card-elevated">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
