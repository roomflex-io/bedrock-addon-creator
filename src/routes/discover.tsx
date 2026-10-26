import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { EXAMPLES, portraitFor } from "@/lib/forge/examples";
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
            const portrait = portraitFor(spec.name);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => openExample(project, navigate, user?.id)}
                className="rounded-lg border border-line bg-raised p-4 text-left"
              >
                {portrait ? (
                  <img src={portrait} alt="" className="mb-4 aspect-[4/3] w-full rounded-md object-cover" />
                ) : (
                  <div className="mb-4 h-2 rounded-full" style={{ background: spec.appearance.primary }} />
                )}
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
