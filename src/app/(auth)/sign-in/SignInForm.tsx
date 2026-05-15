"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, type SignInState } from "@/features/auth/actions";

export default function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signIn,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-150 ease-out hover:bg-gradient-to-br hover:from-primary hover:to-[hsl(219_70%_30%)] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state?.message && (
        <p role="status" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have access?{" "}
        <Link
          href="/public/request-access"
          className="text-primary underline hover:text-primary/80"
        >
          Request it →
        </Link>
      </p>
    </form>
  );
}
