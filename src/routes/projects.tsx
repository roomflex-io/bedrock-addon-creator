import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { deleteCloudProject } from "@/lib/forge/cloud";
import { portraitFor } from "@/lib/forge/examples";
import { selectSpec, useForge } from "@/lib/forge/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/projects")({ component: Projects });

function Projects() {
  const projects = useForge((state) => state.projects);
  const hydrated = useForge((state) => state.hydrated);
  const removeProject = useForge((state) => state.removeProject);
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const list = Object.values(projects)
    .filter((project) => (user ? project.ownerId === user.id : !project.ownerId))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-5xl">Creations</h1>
        <p className="mt-3 max-w-xl text-muted">
          {user
            ? "Only you can see these. Open one to keep editing it."
            : "Only on this device until you sign in. Open one to keep editing it."}
        </p>
        {!hydrated ? <p className="mt-8 text-muted">Loading your creations…</p> : null}
        {hydrated && list.length === 0 ? (
          <p className="mt-8 text-muted">
            Nothing here yet. <Link to="/" className="text-ember">Describe a creation</Link>.
          </p>
        ) : null}
        <ul className="mt-8 space-y-3">
          {list.map((project) => {
            const spec = selectSpec(project);
            const portrait = portraitFor(spec?.name);
            return (
              <li key={project.id} className="flex items-center gap-3 rounded-lg border border-line bg-raised p-4">
                {portrait ? (
                  <img src={portrait} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-md" style={{ background: spec?.appearance.primary ?? "#e39b3a" }} />
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void navigate({ to: "/create/$projectId", params: { projectId: project.id } })}
                >
                  <p className="truncate font-display text-2xl">{spec?.name ?? "Untitled"}</p>
                  <p className="truncate text-sm text-muted">{spec?.summary ?? project.idea}</p>
                  <p className="mt-1 text-sm text-ember">Open and edit</p>
                </button>
                <button
                  type="button"
                  className="h-11 px-2 text-sm text-muted"
                  onClick={() => {
                    removeProject(project.id);
                    if (user) void deleteCloudProject({ data: { id: project.id } }).catch(() => undefined);
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}