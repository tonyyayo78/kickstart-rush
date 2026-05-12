"use client";
import { useActionState } from "react";
import { signInWithEmail, type SignInState } from "@/features/auth/actions";

export default function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInWithEmail,
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
          className="rounded-md border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send magic link"}
      </button>
      {state?.message && (
        <p role="status" className="text-sm text-zinc-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
