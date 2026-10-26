import { createFileRoute, Link } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { AccountForm } from "@/components/account-form";
import { useResumePendingIdea } from "@/lib/forge/resume";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  useResumePendingIdea();
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-display text-2xl">
          <Hammer className="size-5 text-ember" aria-hidden="true" />
          Anvil
        </Link>
        <AccountForm />
      </div>
    </main>
  );
}
