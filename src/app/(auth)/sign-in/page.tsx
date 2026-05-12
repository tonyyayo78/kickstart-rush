import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Sign in
        </h1>
        <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />
        <SignInForm />
      </div>
    </main>
  );
}
