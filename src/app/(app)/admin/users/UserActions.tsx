"use client";
import { useRef } from "react";
import { forceLogout, suspend, reactivate, remove } from "./actions";

interface Props {
  userId: string;
  isSuspended: boolean;
  isSelf: boolean;
}

export function UserActions({ userId, isSuspended, isSelf }: Props) {
  const removeFormRef = useRef<HTMLFormElement>(null);

  const btnBase =
    "rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-1.5">
      <form action={forceLogout}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={isSelf}
          className={`${btnBase} border border-zinc-300 text-zinc-700 hover:bg-zinc-100`}
        >
          Force logout
        </button>
      </form>

      {isSuspended ? (
        <form action={reactivate}>
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={isSelf}
            className={`${btnBase} border border-green-300 text-green-700 hover:bg-green-50`}
          >
            Reactivate
          </button>
        </form>
      ) : (
        <form action={suspend}>
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={isSelf}
            className={`${btnBase} border border-yellow-300 text-yellow-700 hover:bg-yellow-50`}
          >
            Suspend
          </button>
        </form>
      )}

      <form action={remove} ref={removeFormRef}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="button"
          disabled={isSelf}
          className={`${btnBase} border border-red-300 text-red-700 hover:bg-red-50`}
          onClick={() => {
            if (
              window.confirm(
                "Remove this user? They will be permanently suspended and lose all squad access. This cannot be undone.",
              )
            ) {
              removeFormRef.current?.requestSubmit();
            }
          }}
        >
          Remove
        </button>
      </form>
    </div>
  );
}
