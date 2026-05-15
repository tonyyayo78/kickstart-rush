import type { Metadata } from "next";
import { createAnonPublicClient } from "@/lib/supabase/anon-public";
import { submitAccessRequest } from "@/features/access-requests/actions";
import RequestAccessForm from "@/features/access-requests/RequestAccessForm";

export const metadata: Metadata = {
  title: "Request Access — Kickstart FC",
};

export default async function RequestAccessPage() {
  const supabase = await createAnonPublicClient();
  const { data: squads } = await supabase
    .from("squads")
    .select("id, name, code, age_group")
    .order("name")
    .returns<{ id: string; name: string; code: string; age_group: string | null }[]>();

  return (
    <div className="max-w-lg">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Request Access
        </h1>
        <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-accent" />
        <p className="mb-6 text-sm text-muted-foreground">
          Coaches, managers, and team staff can request access here. We&apos;ll review and
          email you a sign-in link once approved.
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <RequestAccessForm action={submitAccessRequest} squads={squads ?? []} />
        </div>
    </div>
  );
}
