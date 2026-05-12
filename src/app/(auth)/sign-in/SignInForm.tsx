"use client";
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
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[#00267F] border-t border-t-[#3349A3] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state?.message && (
        <p role="status" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
