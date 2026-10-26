import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/creator/workspace";

export const Route = createFileRoute("/create/$projectId")({
  component: CreatorRoute,
});

function CreatorRoute() {
  const { projectId } = Route.useParams();
  return <Workspace projectId={projectId} />;
}
