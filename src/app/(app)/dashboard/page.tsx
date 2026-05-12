import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user!.id)
    .single();

  const name = profile?.display_name ?? profile?.email ?? user?.email ?? "owner";

  return <h1 className="text-2xl font-semibold">Welcome, {name}</h1>;
}
