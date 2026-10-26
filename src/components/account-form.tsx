import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase, supabaseConfigured } from "@/lib/auth/supabase";

export const PENDING_IDEA = "anvil.pendingIdea";

export function AccountForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const [mode, setMode] = useState<"up" | "in">("up");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      toast("Sign-in is not connected on this site yet.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { first_name: first.trim(), last_name: last.trim(), name: `${first.trim()} ${last.trim()}`.trim() },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (result.error) {
          toast(result.error.message);
          return;
        }
        if (!result.data.session) {
          setSent(true);
          return;
        }
        onSignedIn?.();
        return;
      }
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        toast(result.error.message);
        return;
      }
      onSignedIn?.();
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseConfigured) {
    return <p className="text-sm text-muted">Sign-in is not connected on this site yet.</p>;
  }
  if (sent) {
    return (
      <p className="text-sm text-muted">
        Check {email.trim()} and confirm the account. Then come back and sign in. Your idea is saved.
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void submit(event)}>
      <h2 className="font-display text-3xl">{mode === "up" ? "Create an account to continue" : "Sign in"}</h2>
      {mode === "up" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" value={first} autoComplete="given-name" onChange={setFirst} />
          <Field label="Last name" value={last} autoComplete="family-name" onChange={setLast} />
        </div>
      ) : null}
      <Field label="Email" value={email} type="email" autoComplete="email" onChange={setEmail} />
      <Field label="Password" value={password} type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} onChange={setPassword} />
      <button type="submit" disabled={busy} className="h-12 w-full rounded-md bg-ember font-semibold text-ink disabled:opacity-40">
        {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
      </button>
      <button type="button" className="h-11 w-full text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>
        {mode === "up" ? "Already confirmed? Sign in" : "Need an account? Create one"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <input
        required
        type={type}
        minLength={type === "password" ? 6 : undefined}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-fg outline-none focus:border-ember"
      />
    </label>
  );
}
