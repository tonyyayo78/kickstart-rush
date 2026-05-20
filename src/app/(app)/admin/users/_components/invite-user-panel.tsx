"use client";

import { useState } from "react";
import { inviteUser } from "../actions";
import SquadsCheckboxGrid, { type SquadOption } from "./squads-checkbox-grid";

type Props = {
  allSquads: SquadOption[];
};

export default function InviteUserPanel({ allSquads }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-[#00267F] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#3349A3]"
      >
        {open ? "Cancel invite" : "+ Invite user"}
      </button>

      {open && (
        <form
          action={inviteUser}
          className="mt-3 flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4"
        >
          <p className="text-xs text-zinc-500">
            Create a user directly without them filling the public request form. A magic link will
            be generated for you to send them.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-zinc-700">Email</span>
              <input
                type="email"
                name="email"
                required
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-zinc-700">Role</span>
              <input
                type="text"
                name="role"
                defaultValue="Coach"
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-zinc-700">First name</span>
              <input
                type="text"
                name="firstName"
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-zinc-700">Last name</span>
              <input
                type="text"
                name="lastName"
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-700">Squads</p>
            <SquadsCheckboxGrid allSquads={allSquads} selectedIds={[]} name="squadIds" />
          </div>

          <button
            type="submit"
            className="self-start rounded-md bg-[#00267F] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#3349A3]"
          >
            Create user &amp; generate link
          </button>
        </form>
      )}
    </div>
  );
}
