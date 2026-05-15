import Link from "next/link";
import { Logo } from "@/components/logo";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Link href="/public/fixtures" className="mb-8 block hover:opacity-80 transition-opacity">
          <Logo className="h-12 md:h-16" priority />
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Sign in
        </h1>
        <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />
        <SignInForm />
      </div>
    </main>
  );
}
