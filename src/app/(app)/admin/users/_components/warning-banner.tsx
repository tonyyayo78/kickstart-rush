"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function WarningBanner({ warning }: { warning: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const stripped = useRef(false);

  // Strip ?warning= from the URL on first render so the credentials don't
  // persist in browser history, Referrer headers, or server access logs.
  useEffect(() => {
    if (!stripped.current) {
      stripped.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("warning");
      router.replace(url.pathname + (url.search || ""));
    }
  }, [router]);

  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-900">Action completed with a warning</p>
          <p className="mt-1 break-all font-mono text-xs text-amber-800">{warning}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-xs text-amber-700 hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
