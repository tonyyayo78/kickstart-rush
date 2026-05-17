"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

/**
 * RealtimePublicRefresh
 *
 * Subscribes to row-change events on fixtures, results, goals, and cards.
 * On any change, calls router.refresh() to re-fetch the Server Component
 * data and re-render the page.
 *
 * Lifecycle:
 *   - Subscribes on mount when document.visibilityState === "visible".
 *   - Unsubscribes when the tab is hidden (saves bandwidth on background tabs).
 *   - Resubscribes + router.refresh() when the tab becomes visible again
 *     (catches any events missed while hidden).
 *
 * Fallback: if the WebSocket fails to connect (corp firewall, mobile network,
 * Realtime outage), this component silently no-ops. The page still receives
 * fresh data via Brief 21's revalidatePublic() calls on the next navigation
 * or refresh. Intentional defense-in-depth.
 */
export default function RealtimePublicRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    function subscribe() {
      if (channel) return;
      channel = supabase
        .channel("public-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => router.refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => router.refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, () => router.refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => router.refresh())
        .subscribe();
    }

    function unsubscribe() {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        subscribe();
        // Catch up on any events fired while the tab was hidden.
        router.refresh();
      } else {
        unsubscribe();
      }
    }

    // Initial subscribe if the page is visible on mount.
    if (document.visibilityState === "visible") {
      subscribe();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
    };
  }, [router]);

  return null;
}
