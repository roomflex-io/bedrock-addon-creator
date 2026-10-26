import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { CoinPill } from "@/components/coin-pill";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function SiteHeader() {
  const { isPending, user } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const pending = !ready || isPending;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-fg">
          <Hammer className="size-5 text-ember" aria-hidden="true" />
          Anvil
        </Link>
        <nav className="ml-3 flex items-center gap-3 text-sm text-muted sm:ml-4 sm:gap-4">
          <Link to="/discover" className="hover:text-fg">
            Discover
          </Link>
          <Link to="/projects" className="hover:text-fg">
            Creations
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CoinPill />
          {pending ? <span className="size-8 rounded-full bg-surface" /> : null}
          {!pending && user ? (
            <SignedIn>
              <UserButton />
            </SignedIn>
          ) : null}
          {!pending && !user ? (
            <SignedOut>
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-md border border-line px-3 text-sm text-fg"
              >
                Sign in
              </Link>
            </SignedOut>
          ) : null}
        </div>
      </div>
    </header>
  );
}
