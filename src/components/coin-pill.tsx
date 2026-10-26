import { useState } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { claimGrant } from "@/lib/forge/cloud";
import { useForge } from "@/lib/forge/store";
import { STARTER_COINS } from "@/lib/forge/spec";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function CoinPill() {
  const wallet = useForge((state) => state.wallet);
  const claimGrantLocal = useForge((state) => state.claimGrantLocal);
  const setWallet = useForge((state) => state.setWallet);
  const hydrated = useForge((state) => state.hydrated);
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(user && !user.isDevFallback);

  if (isPending || !signedIn) return null;

  async function claim() {
    if (wallet.grantClaimed || busy) return;
    setBusy(true);
    try {
      if (user) {
        const result = await claimGrant();
        setWallet({
          coins: result.coins,
          grantClaimed: result.ok || wallet.grantClaimed,
          starterGranted: wallet.starterGranted,
        });
        if (!result.ok) toast("The workshop grant was already claimed.");
      } else if (!claimGrantLocal()) {
        toast("The workshop grant was already claimed.");
      }
      setOpen(false);
    } catch {
      toast("Could not claim the grant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-raised px-3 text-sm"
      >
        <Coins className="size-4 text-ember" aria-hidden="true" />
        <span className="tabular-nums">{hydrated ? wallet.coins : "–"}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-line bg-raised p-4 shadow-lg">
          <p className="text-sm text-fg">
            {wallet.starterGranted
              ? "Coins pay for described changes. Moving a slider yourself is free."
              : `Your first creation adds ${STARTER_COINS} coins, then uses 1. Sliders stay free.`}
          </p>
          <p className="mt-2 text-sm text-muted">
            Balance <span className="tabular-nums text-fg">{wallet.coins}</span>
          </p>
          <button
            type="button"
            disabled={wallet.grantClaimed || busy}
            onClick={() => void claim()}
            className="mt-3 h-11 w-full rounded-md bg-ember px-3 text-sm font-semibold text-ink disabled:opacity-40"
          >
            {wallet.grantClaimed ? "Grant claimed" : "Claim 8 workshop coins"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
