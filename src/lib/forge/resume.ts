import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PENDING_IDEA } from "@/components/account-form";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { newId } from "./spec";
import { useForge } from "./store";

export function useResumePendingIdea() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (isPending || !user || user.isDevFallback || started.current) return;
    const idea = localStorage.getItem(PENDING_IDEA);
    if (!idea) return;
    started.current = true;
    localStorage.removeItem(PENDING_IDEA);
    const id = newId();
    useForge.getState().stashPending(id, idea);
    void navigate({ to: "/create/$projectId", params: { projectId: id } });
  }, [isPending, navigate, user]);
}
