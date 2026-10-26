import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { EXAMPLES } from "@/lib/forge/examples";
import { FigureStill } from "@/components/creator/figure-still";
import { openExample } from "@/routes/index";

export const Route = createFileRoute("/discover")({ component: Discover });

function Discover() {
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-5xl">Discover</h1>
        <p className="mt-3 max-w-xl text-muted">Open any of these in the workshop. They become yours to change.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map((project) => {
            const spec = project.generationHistory[0]?.spec;
            if (!spec) return null;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => openExample(project, navigate, user?.id)}
                className="rounded-lg border border-line bg-raised p-4 text-left"
              >
                <FigureStill spec={spec} className="mb-4 aspect-[4/3] w-full rounded-md" />
                <p className="font-display text-3xl">{spec.name}</p>
                <p className="mt-2 text-sm text-muted">{spec.summary}</p>
                <p className="mt-3 text-sm text-ember">Open in the workshop</p>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
