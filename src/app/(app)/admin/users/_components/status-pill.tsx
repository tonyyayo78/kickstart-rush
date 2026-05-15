export type UserStatus = "suspended" | "invited" | "active-now" | "active" | "idle";

const CONFIG: Record<UserStatus, { label: string; cls: string; dot?: true }> = {
  suspended:    { label: "Suspended",       cls: "bg-red-100 text-red-700" },
  invited:      { label: "Invited",         cls: "bg-amber-100 text-amber-800" },
  "active-now": { label: "Active now",      cls: "bg-green-100 text-green-800", dot: true },
  active:       { label: "Active",          cls: "bg-green-100 text-green-700" },
  idle:         { label: "Idle",            cls: "bg-zinc-100 text-zinc-500" },
};

export function StatusPill({ status }: { status: UserStatus }) {
  const { label, cls, dot } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {dot && <span className="size-1.5 rounded-full bg-green-500" />}
      {label}
    </span>
  );
}

export function resolveStatus(
  bannedUntil: string | null | undefined,
  emailConfirmedAt: string | null | undefined,
  lastActiveAt: string | null | undefined,
  lastSignInAt: string | null | undefined,
): UserStatus {
  const now = Date.now();
  if (bannedUntil && new Date(bannedUntil).getTime() > now) return "suspended";
  if (!emailConfirmedAt) return "invited";
  if (lastActiveAt && now - new Date(lastActiveAt).getTime() < 5 * 60 * 1000)
    return "active-now";
  if (
    lastSignInAt &&
    now - new Date(lastSignInAt).getTime() < 30 * 24 * 60 * 60 * 1000
  )
    return "active";
  return "idle";
}
