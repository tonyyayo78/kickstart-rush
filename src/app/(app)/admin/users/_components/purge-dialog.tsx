"use client";
import { useState } from "react";
import { purge } from "../actions";

interface Props {
  target: { id: string; email: string } | null;
  onClose: () => void;
}

export function PurgeDialog({ target, onClose }: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [clientError, setClientError] = useState("");

  if (!target) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (emailInput.trim().toLowerCase() !== target!.email.toLowerCase()) {
      e.preventDefault();
      setClientError("Email does not match. Type it exactly.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Purge user"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Permanently purge user</h2>
        <p className="mt-2 text-sm text-zinc-600">
          This hard-deletes <strong>{target.email}</strong> from auth and cannot be
          undone. Historical records (audit log, results, etc.) are preserved with
          authorship anonymised.
        </p>
        <p className="mt-3 text-sm text-zinc-700 font-medium">
          Type{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            {target.email}
          </code>{" "}
          to confirm:
        </p>
        <form action={purge} onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input type="hidden" name="userId" value={target.id} />
          <input
            type="text"
            name="confirmedEmail"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setClientError("");
            }}
            placeholder={target.email}
            autoFocus
            autoComplete="off"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {clientError && (
            <p role="alert" className="text-xs text-red-600">
              {clientError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Purge permanently
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
