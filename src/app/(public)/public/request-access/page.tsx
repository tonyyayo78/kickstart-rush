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
      <h1 className="text-2xl font-black uppercase tracking-tight">Request Access</h1>
      <div className="mt-2 mb-4 h-1 w-16 bg-[#FFC726]" />
      <p className="mb-6 text-sm text-zinc-600">
        Coaches, managers, and team staff can request access here. We&apos;ll review and
        email you a sign-in link once approved.
      </p>
      <RequestAccessForm action={submitAccessRequest} squads={squads ?? []} />
    </div>
  );
}
