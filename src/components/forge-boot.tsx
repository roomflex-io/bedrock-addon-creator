import { useEffect } from "react";
import { useForge } from "@/lib/forge/store";

export function ForgeBoot() {
  const setHydrated = useForge((state) => state.setHydrated);
  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useForge.persist.hasHydrated()) finish();
    const unsub = useForge.persist.onFinishHydration(finish);
    void useForge.persist.rehydrate();
    return () => {
      unsub();
    };
  }, [setHydrated]);
  return null;
}
