"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { RequestAccessState } from "./actions";

type Squad = { id: string; name: string; code: string; age_group: string | null };

type Props = {
  action: (prev: RequestAccessState, formData: FormData) => Promise<RequestAccessState>;
  squads: Squad[];
};

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Head Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "team_manager", label: "Team Manager" },
  { value: "technical_staff", label: "Technical Staff" },
  { value: "parent", label: "Parent" },
  { value: "other", label: "Other" },
] as const;

const inputCls =
  "w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export default function RequestAccessForm({ action, squads }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <p className="font-semibold text-green-800">Request received</p>
        <p className="mt-1 text-sm text-green-700">
          Thanks — your request has been received. You&apos;ll get an email when it&apos;s reviewed.
        </p>
        <Link
          href="/public/standings"
          className="mt-4 inline-block text-sm text-[#00267F] underline hover:text-[#3349A3]"
        >
          ← Back to standings
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state?.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Honeypot — hidden from real users */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="first_name" className="text-sm font-medium">
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            autoComplete="given-name"
            className={inputCls}
          />
          <FieldError errors={state?.errors?.first_name} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="last_name" className="text-sm font-medium">
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            autoComplete="family-name"
            className={inputCls}
          />
          <FieldError errors={state?.errors?.last_name} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
        />
        <FieldError errors={state?.errors?.email} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select id="role" name="role" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            — select a role —
          </option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <FieldError errors={state?.errors?.role} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Team(s)</legend>
        {squads.map((squad) => (
          <label key={squad.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="team_ids"
              value={squad.id}
              className="h-4 w-4 rounded border-black/20 accent-[#00267F] focus:ring-2 focus:ring-[#00267F]"
            />
            {squad.name}
            {squad.age_group ? ` (${squad.age_group})` : ""}
          </label>
        ))}
        <FieldError errors={state?.errors?.team_ids} />
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium">
          Message{" "}
          <span className="ml-1 text-xs font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Anything else we should know? (optional)"
          className={inputCls}
        />
        <FieldError errors={state?.errors?.notes} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#00267F] border-t border-t-[#3349A3] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Submitting…" : "Request Access"}
      </button>
    </form>
  );
}
