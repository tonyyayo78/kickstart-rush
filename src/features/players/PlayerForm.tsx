"use client";
import { useActionState, useState } from "react";
import type { PlayerFormState } from "./actions";

type SquadPlayer = {
  id: string;
  jersey_number: number | null;
  first_name: string;
  last_name: string;
};

type Props = {
  action: (prev: PlayerFormState, formData: FormData) => Promise<PlayerFormState>;
  defaultValues?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string | null;
    preferred_position?: "GK" | "DEF" | "MID" | "FWD" | null;
    jersey_number?: number | null;
    status?: "active" | "injured" | "unavailable" | "inactive";
    notes_summary?: string | null;
  };
  submitLabel?: string;
  cancelHref: string;
  squadPlayers?: SquadPlayer[];
  currentPlayerId?: string;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

const inputCls =
  "w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]";

function OptionalBadge() {
  return <span className="ml-1 text-xs font-normal text-zinc-400">(optional)</span>;
}

export default function PlayerForm({
  action,
  defaultValues,
  submitLabel = "Save player",
  cancelHref,
  squadPlayers,
  currentPlayerId,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [jerseyWarning, setJerseyWarning] = useState<string | null>(null);

  function handleJerseyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val || !squadPlayers?.length) {
      setJerseyWarning(null);
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setJerseyWarning(null);
      return;
    }
    const clash = squadPlayers.find(
      (p) => p.jersey_number === num && p.id !== currentPlayerId,
    );
    setJerseyWarning(
      clash
        ? `Jersey #${num} is already used by ${clash.first_name} ${clash.last_name} in this squad.`
        : null,
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      {state?.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

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
            defaultValue={defaultValues?.first_name}
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
            defaultValue={defaultValues?.last_name}
            className={inputCls}
          />
          <FieldError errors={state?.errors?.last_name} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date_of_birth" className="text-sm font-medium">
          Date of birth <OptionalBadge />
        </label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          min="2011-01-01"
          max="2013-12-31"
          defaultValue={defaultValues?.date_of_birth ?? ""}
          className={inputCls}
        />
        <FieldError errors={state?.errors?.date_of_birth} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="preferred_position" className="text-sm font-medium">
            Position <OptionalBadge />
          </label>
          <select
            id="preferred_position"
            name="preferred_position"
            defaultValue={defaultValues?.preferred_position ?? ""}
            className={inputCls}
          >
            <option value="">— not set —</option>
            <option value="GK">GK — Goalkeeper</option>
            <option value="DEF">DEF — Defender</option>
            <option value="MID">MID — Midfielder</option>
            <option value="FWD">FWD — Forward</option>
          </select>
          <FieldError errors={state?.errors?.preferred_position} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="jersey_number" className="text-sm font-medium">
            Jersey number <OptionalBadge />
          </label>
          <input
            id="jersey_number"
            name="jersey_number"
            type="number"
            min={1}
            max={99}
            defaultValue={defaultValues?.jersey_number ?? ""}
            onChange={handleJerseyChange}
            className={inputCls}
          />
          {jerseyWarning ? (
            <p className="mt-1 text-xs text-amber-600">{jerseyWarning}</p>
          ) : (
            <FieldError errors={state?.errors?.jersey_number} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "active"}
          className={inputCls}
        >
          <option value="active">Active</option>
          <option value="injured">Injured</option>
          <option value="unavailable">Unavailable</option>
          <option value="inactive">Inactive</option>
        </select>
        <FieldError errors={state?.errors?.status} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes_summary" className="text-sm font-medium">
          Notes <OptionalBadge />
        </label>
        <textarea
          id="notes_summary"
          name="notes_summary"
          rows={3}
          defaultValue={defaultValues?.notes_summary ?? ""}
          className={inputCls}
        />
        <FieldError errors={state?.errors?.notes_summary} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#00267F] border-t border-t-[#3349A3] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="text-sm text-zinc-500 hover:text-zinc-700 underline"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
