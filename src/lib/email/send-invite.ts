import "server-only";
import { env } from "@/lib/env";

type SendInviteParams = {
  to: string;
  firstName: string | null;
  tempPassword: string;
  signInUrl: string;
};

type SendInviteResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendInviteEmail({
  to,
  firstName,
  tempPassword,
  signInUrl,
}: SendInviteParams): Promise<SendInviteResult> {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden">
        <tr>
          <td style="background:#00267F;padding:24px 32px">
            <p style="margin:0;color:#FFC726;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Kickstart RUSH FC</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;font-size:16px;color:#18181b">${greeting}</p>
            <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6">
              Your Kickstart Rush account has been approved. Use the credentials below to sign in.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:6px;margin-bottom:24px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.08em">Email</p>
                  <p style="margin:0 0 16px;font-size:15px;color:#18181b;font-family:monospace">${to}</p>
                  <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.08em">Temporary password</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#00267F;font-family:monospace;letter-spacing:.05em">${tempPassword}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td align="center">
                  <a href="${signInUrl}" style="display:inline-block;background:#00267F;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:14px 32px;border-radius:6px;border-top:1px solid #3349A3">
                    Sign in →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6">
              You'll be asked to set a new password on your first sign-in. Keep this email until you've done that.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f4f4f5">
            <p style="margin:0;font-size:12px;color:#a1a1aa">Kickstart Rush FC · Barbados</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Your Kickstart Rush account has been approved.

Email: ${to}
Temporary password: ${tempPassword}

Sign in at: ${signInUrl}

You'll be asked to set a new password on your first sign-in.`;

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kickstart RUSH FC <onboarding@resend.dev>",
        to,
        subject: "Your Kickstart Rush account is ready",
        html,
        text,
      }),
    });
  } catch (fetchErr) {
    const error = `Resend fetch failed: ${String(fetchErr)}`;
    console.error("[sendInviteEmail]", error);
    return { ok: false, error };
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("[sendInviteEmail] Resend error response:", JSON.stringify(body));
    return {
      ok: false,
      error: `Resend ${res.status}: ${body?.message ?? body?.name ?? "unknown error"}`,
    };
  }

  return { ok: true, messageId: (body as { id: string }).id };
}
