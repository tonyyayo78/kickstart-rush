"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MagicLinkToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Capture the URL params on the initial render so the toast persists after
  // the URL is stripped (dismissal is still possible after stripping).
  const [link] = useState<string | null>(() => searchParams.get("magic"));
  const [email] = useState<string | null>(() => searchParams.get("email"));
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const stripped = useRef(false);

  // Strip the params from the URL exactly once so the link doesn't stick
  // in the address bar or appear in shared screenshots.
  useEffect(() => {
    if (link && email && !stripped.current) {
      stripped.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("magic");
      url.searchParams.delete("email");
      router.replace(url.pathname + (url.search || ""));
    }
  }, [link, email, router]);

  if (!link || !email || dismissed) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Clipboard write failed:", e);
    }
  }

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Magic link generated for {email}
            </p>
            <p className="text-xs text-amber-800">
              Copy this link and send it to the user via WhatsApp, email, or however you normally
              reach them. The link is single-use and expires in 1 hour.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-amber-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={link}
            className="flex-1 rounded border border-amber-300 bg-white px-2 py-1 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white hover:bg-amber-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
