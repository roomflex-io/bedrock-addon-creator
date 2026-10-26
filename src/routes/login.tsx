import { createFileRoute, Link } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-display text-2xl">
          <Hammer className="size-5 text-ember" aria-hidden="true" />
          Anvil
        </Link>
        <h1 className="font-display text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Save projects across devices and download add-ons.</p>
        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
                className="h-12 w-full rounded-md border border-line bg-raised"
              >
                Continue with {provider.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is off in this build.</p>
          )}
        </div>
      </div>
    </main>
  );
}
