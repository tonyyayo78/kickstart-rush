import { createServerClient } from "@/lib/supabase/server";

const LINKS = [
  {
    href: "/fixtures",
    title: "Enter results",
    description: "Record match scores and goalscorers",
  },
  {
    href: "/standings",
    title: "View standings",
    description: "Check the table for Elite and Premier",
  },
  {
    href: "/teams",
    title: "Manage squads",
    description: "View and edit player rosters",
  },
  {
    href: "/fees",
    title: "Match fees",
    description: "Record who paid match fees",
  },
];

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, is_approver")
    .eq("id", user!.id)
    .single();

  const rawName = profile?.display_name ?? profile?.email ?? user?.email ?? "owner";
  const name = rawName.includes(" ") ? rawName.split(" ")[0] : rawName;
  const isApprover = profile?.is_approver ?? false;

  return (
    <div>
      {/* Hero gradient strip */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary via-primary to-[hsl(219_60%_35%)] dark:from-[hsl(219_47%_35%)] dark:via-primary dark:to-[hsl(219_60%_55%)] px-8 py-8 text-primary-foreground shadow-card-elevated">
        <p className="text-sm font-medium text-primary-foreground/70 mb-1 uppercase tracking-wider">
          Dashboard
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Welcome back, {name}
        </h1>
        <p className="mt-2 text-primary-foreground/70 text-sm">
          Kickstart Football Club Barbados — U15 Operations
        </p>
      </div>

      {/* Quick-action cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-border bg-card p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
          >
            <h2 className="font-display text-base font-semibold tracking-tight text-card-foreground">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            <p className="mt-4 font-bold text-accent">→</p>
          </a>
        ))}
        {isApprover && (
          <a
            href="/admin/users"
            className="group rounded-xl border border-border bg-card p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
          >
            <h2 className="font-display text-base font-semibold tracking-tight text-card-foreground">
              User Admin
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Review and approve pending access</p>
            <p className="mt-4 font-bold text-accent">→</p>
          </a>
        )}
      </div>
    </div>
  );
}
