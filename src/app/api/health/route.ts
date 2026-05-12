import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("squads").select("id").limit(1);

    if (!error) {
      return Response.json({ ok: true, supabase: "reachable", schema: "deployed" });
    }

    // 42P01 = Postgres "relation does not exist"
    // PGRST205 = PostgREST "relation not found in schema cache"
    // Both are expected before migrations are applied.
    if (error.code === "42P01" || error.code === "PGRST205") {
      return Response.json({
        ok: true,
        supabase: "reachable",
        note: "expected: schema not deployed",
      });
    }

    return Response.json({ ok: false, error: "Supabase query failed" }, { status: 500 });
  } catch {
    return Response.json({ ok: false, error: "Supabase connection failed" }, { status: 500 });
  }
}
