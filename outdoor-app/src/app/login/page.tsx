import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-stone-900">Welcome back</h1>
        <p className="mb-6 text-sm text-stone-500">
          Sign in to write reviews and track your adventures.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
