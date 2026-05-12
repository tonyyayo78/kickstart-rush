"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const emailSchema = z.string().email();

const GENERIC_MESSAGE =
  "If your email is allow-listed, a sign-in link has been sent.";

// Hash both strings to equal-length buffers before comparing so
// timingSafeEqual never leaks information via buffer-length mismatch.
function safeEmailEqual(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export type SignInState = { message: string } | null;

export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { message: "Please enter a valid email address." };
  }

  const email = parsed.data;

  if (!safeEmailEqual(email.toLowerCase(), env.OWNER_ALLOWED_EMAIL.toLowerCase())) {
    return { message: GENERIC_MESSAGE };
  }

  const supabase = await createServerClient();
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  // Always return the same message — never reveal OTP success or failure.
  return { message: GENERIC_MESSAGE };
}

export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/sign-in");
}
