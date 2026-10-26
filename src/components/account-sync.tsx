import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listCloudProjects, saveCloudProject, syncAccount, grantStarter } from "@/lib/forge/cloud";
import { useForge } from "@/lib/forge/store";

export function AccountSync() {
  const { user, isPending } = useCurrentUserState();
  const setWallet = useForge((state) => state.setWallet);
  const setAccountReady = useForge((state) => state.setAccountReady);
  const mergeRemote = useForge((state) => state.mergeRemote);
  const claimOwner = useForge((state) => state.claimOwner);
  const projects = useForge((state) => state.projects);
  const accountReady = useForge((state) => state.accountReady);
  const hydrated = useForge((state) => state.hydrated);
  const userId = user?.id;
  const sent = useRef<Record<string, string>>({});

  useEffect(() => {
    if (isPending || !hydrated) return;
    if (!userId) {
      setAccountReady(true);
      return;
    }
    let cancelled = false;
    claimOwner(userId);
    const guest = useForge.getState().wallet;
    void (async () => {
      try {
        const [synced, remote] = await Promise.all([
          syncAccount({
            data: {
              guestCoins: guest.coins,
              guestGrantClaimed: guest.grantClaimed,
              guestStarterGranted: guest.starterGranted,
            },
          }),
          listCloudProjects(),
        ]);
        if (cancelled) return;
        let wallet = synced;
        if (!wallet.starterGranted) {
          const granted = await grantStarter();
          if (granted.ok) wallet = { coins: granted.coins, grantClaimed: wallet.grantClaimed, starterGranted: true };
        }
        setWallet({
          coins: wallet.coins,
          grantClaimed: wallet.grantClaimed,
          starterGranted: wallet.starterGranted,
        });
        mergeRemote(remote);
        claimOwner(userId);
      } catch {
        if (!cancelled && user && !user.isDevFallback && !useForge.getState().wallet.starterGranted) {
          useForge.getState().grantStarterLocal();
        }
      } finally {
        if (!cancelled) setAccountReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPending, hydrated, userId, mergeRemote, claimOwner, setAccountReady, setWallet]);

  useEffect(() => {
    if (!userId || !accountReady || !hydrated) return;
    for (const project of Object.values(projects)) {
      if (project.phase === "shaping") continue;
      if (sent.current[project.id] === project.updatedAt) continue;
      sent.current[project.id] = project.updatedAt;
      void saveCloudProject({ data: project }).catch(() => {
        delete sent.current[project.id];
      });
    }
  }, [accountReady, hydrated, projects, userId]);

  return null;
}
