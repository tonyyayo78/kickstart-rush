"use client";
import { useActionState } from "react";
import { setPassword, type SetPasswordState } from "@/features/auth/actions";

const inputCls =
  "w-full rounded-md border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]";

export default function SetPasswordForm() {
  const [state, formAction, pending] = useActionState<SetPasswordState, FormData>(
    setPassword,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[#00267F] border-t border-t-[#3349A3] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
      >
        {pending ? "Setting password…" : "Set password"}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
