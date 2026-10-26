import { useMemo, useState } from "react";
import { buildTextFiles, texturePath } from "@/lib/forge/pack";
import type { Project, Spec } from "@/lib/forge/types";

export function FilesPanel({ spec, project }: { spec: Spec; project: Project }) {
  const files = useMemo(() => buildTextFiles(spec, project.packIds), [spec, project.packIds]);
  const [open, setOpen] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const groups = ["Behaviour pack", "Resource pack"] as const;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">{spec.name}</h2>
        <button type="button" className="text-sm text-muted" onClick={() => setAdvanced((value) => !value)}>
          {advanced ? "Hide details" : "Advanced details"}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">The pack is assembled when you download. This is the shape of it.</p>
      {groups.map((group) => (
        <section key={group} className="mt-5">
          <h3 className="text-sm font-semibold tracking-wide text-muted">{group}</h3>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-md border border-line">
            {files.filter((file) => file.group === group).map((file) => (
              <li key={file.path}>
                <button type="button" className="flex w-full items-center justify-between px-3 py-3 text-left" onClick={() => setOpen(open === file.path ? null : file.path)}>
                  <span>{file.title}</span>
                  <span className="text-sm text-faint">{file.path.split("/").slice(-1)}</span>
                </button>
                {advanced && open === file.path ? (
                  <pre className="max-h-64 overflow-auto border-t border-line bg-bg px-3 py-3 text-xs text-muted">{file.text}</pre>
                ) : null}
              </li>
            ))}
            {group === "Resource pack" ? (
              <li className="px-3 py-3 text-sm text-muted">Texture · {texturePath(spec).split("/").slice(-1)}</li>
            ) : null}
          </ul>
        </section>
      ))}
    </div>
  );
}
