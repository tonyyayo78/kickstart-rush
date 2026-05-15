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
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card-elevated">
        <h2 className="font-display text-base font-semibold text-card-foreground">Permanently purge user</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This hard-deletes <strong className="text-foreground">{target.email}</strong> from auth and cannot be
          undone. Historical records (audit log, results, etc.) are preserved with
          authorship anonymised.
        </p>
        <p className="mt-3 text-sm font-medium text-foreground">
          Type{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
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
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
          />
          {clientError && (
            <p role="alert" className="text-xs text-destructive">
              {clientError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              Purge permanently
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
