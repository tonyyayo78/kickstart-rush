export type UserStatus = "suspended" | "invited" | "active-now" | "active" | "idle";

const CONFIG: Record<UserStatus, { label: string; cls: string; dot?: true }> = {
  "active-now": {
    label: "Active now",
    cls: "bg-success/10 text-success border border-success/20",
    dot: true,
  },
  active: {
    label: "Active",
    cls: "bg-success/10 text-success border border-success/20",
  },
  idle: {
    label: "Idle",
    cls: "bg-muted text-muted-foreground border border-border",
  },
  invited: {
    label: "Invited",
    cls: "bg-accent/10 text-accent-foreground border border-accent/30",
  },
  suspended: {
    label: "Suspended",
    cls: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

export function StatusPill({ status }: { status: UserStatus }) {
  const { label, cls, dot } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )}
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
