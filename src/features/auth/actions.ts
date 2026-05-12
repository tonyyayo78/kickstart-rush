"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const GENERIC_MESSAGE = "Invalid email or password.";

// Hash both strings to equal-length buffers before comparing so
// timingSafeEqual never leaks information via buffer-length mismatch.
function safeEmailEqual(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export type SignInState = { message: string } | null;

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { message: GENERIC_MESSAGE };
  }

  const { email, password } = parsed.data;

  if (!safeEmailEqual(email.toLowerCase(), env.OWNER_ALLOWED_EMAIL.toLowerCase())) {
    return { message: GENERIC_MESSAGE };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: GENERIC_MESSAGE };
  }

  revalidatePath("/");
  redirect("/dashboard");
}

export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/sign-in");
}
