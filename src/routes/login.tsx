import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { toast } from "sonner";
import { supabase, supabaseConfigured } from "@/lib/auth/supabase";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const result =
        mode === "up"
          ? await supabase.auth.signUp({ email: email.trim(), password })
          : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        toast(result.error.message);
        return;
      }
      if (mode === "up" && !result.data.session) {
        toast("Check your email to confirm, then sign in.");
        setMode("in");
        return;
      }
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-display text-2xl">
          <Hammer className="size-5 text-ember" aria-hidden="true" />
          Anvil
        </Link>
        <h1 className="font-display text-4xl">{mode === "up" ? "Create account" : "Sign in"}</h1>
        <p className="mt-2 text-sm text-muted">Save projects across devices.</p>
        {supabaseConfigured ? (
          <form className="mt-6 space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm text-muted">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-line bg-raised px-3 text-fg outline-none focus:border-ember"
              />
            </label>
            <label className="block text-sm text-muted">
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-line bg-raised px-3 text-fg outline-none focus:border-ember"
              />
            </label>
            <button type="submit" disabled={busy} className="h-12 w-full rounded-md bg-ember font-semibold text-ink disabled:opacity-40">
              {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              className="h-11 w-full text-sm text-muted"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is not connected yet.</p>
        )}
      </div>
    </main>
  );
}
