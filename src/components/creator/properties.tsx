import { useEffect, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { newId, statLabel } from "@/lib/forge/spec";
import type { AbilityType, Behavior, CreationKind, Rarity, Spec } from "@/lib/forge/types";

type PropertiesProps = {
  spec: Spec;
  focus?: string;
  onChange: (mutate: (spec: Spec) => Spec) => void;
};

const inputClass = "h-11 w-full rounded-md border border-line bg-bg px-3 text-fg outline-none focus:border-ember";

export function Properties({ spec, focus, onChange }: PropertiesProps) {
  useEffect(() => {
    if (!focus) return;
    document.getElementById(`section-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

  const set = (mutate: (spec: Spec) => void) => onChange((draft) => { mutate(draft); return draft; });

  return (
    <div className="space-y-6 p-4">
      <section id="section-identity" className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted">Identity</h2>
        <label className="block text-sm text-muted">
          Name
          <input className={`${inputClass} mt-1`} value={spec.name} maxLength={32} onChange={(event) => set((draft) => { draft.name = event.target.value; })} />
        </label>
        <label className="block text-sm text-muted">
          Type
          <select className={`${inputClass} mt-1`} value={spec.type} onChange={(event) => set((draft) => { draft.type = event.target.value as CreationKind; })}>
            <option value="mob">Mob</option>
            <option value="weapon">Weapon</option>
            <option value="item">Item</option>
            <option value="block">Block</option>
          </select>
        </label>
        <label className="block text-sm text-muted">
          Summary
          <textarea className={`${inputClass} mt-1 h-24 py-2`} value={spec.summary} maxLength={280} onChange={(event) => set((draft) => { draft.summary = event.target.value; })} />
        </label>
      </section>

      <section id="section-body" className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted">Body</h2>
        <Slider label={statLabel(spec.type, "health")} min={1} max={spec.type === "mob" ? 1000 : 500} step={1} value={spec.health} onChange={(value) => set((draft) => { draft.health = value; })} />
        <Slider label={statLabel(spec.type, "damage")} min={0} max={40} step={1} value={spec.damage} onChange={(value) => set((draft) => { draft.damage = value; })} />
        {spec.type === "mob" ? (
          <Slider label="Movement speed" min={0} max={0.45} step={0.01} value={spec.movementSpeed} onChange={(value) => set((draft) => { draft.movementSpeed = value; })} />
        ) : null}
        <Slider label="Scale" min={0.4} max={4} step={0.05} value={spec.scale} onChange={(value) => set((draft) => { draft.scale = value; })} />
      </section>

      <section id="section-behaviour" className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted">Behaviour</h2>
        <label className="block text-sm text-muted">
          Temper
          <select className={`${inputClass} mt-1`} value={spec.behavior} onChange={(event) => set((draft) => { draft.behavior = event.target.value as Behavior; })}>
            <option value="hostile">Hostile</option>
            <option value="neutral">Neutral</option>
            <option value="passive">Passive</option>
          </select>
        </label>
        {spec.type === "mob" ? (
          <label className="flex items-center justify-between gap-3 text-sm">
            Friendly during the day
            <input type="checkbox" className="size-5 accent-ember" checked={spec.friendlyByDay} onChange={(event) => set((draft) => { draft.friendlyByDay = event.target.checked; })} />
          </label>
        ) : null}
      </section>

      <Fold id="section-spawn" title="Spawning" open={focus === "spawn"}>
        <label className="block text-sm text-muted">
          Where
          <input className={`${inputClass} mt-1`} value={spec.spawn.where} onChange={(event) => set((draft) => { draft.spawn.where = event.target.value; })} />
        </label>
        <label className="mt-3 block text-sm text-muted">
          Rarity
          <select className={`${inputClass} mt-1`} value={spec.spawn.rarity} onChange={(event) => set((draft) => { draft.spawn.rarity = event.target.value as Rarity; })}>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="legendary">Legendary</option>
          </select>
        </label>
      </Fold>

      <Fold id="section-drops" title="Drops" open={focus === "drops"}>
        <ul className="space-y-3">
          {spec.drops.map((drop) => (
            <li key={drop.id} className="rounded-md border border-line p-3">
              <div className="flex gap-2">
                <input className={inputClass} value={drop.item} onChange={(event) => set((draft) => { const row = draft.drops.find((item) => item.id === drop.id); if (row) row.item = event.target.value; })} />
                <button type="button" aria-label="Remove drop" className="grid size-11 shrink-0 place-items-center rounded-md border border-line" onClick={() => set((draft) => { draft.drops = draft.drops.filter((item) => item.id !== drop.id); })}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3">
                <Slider label="Quantity" min={1} max={16} step={1} value={drop.quantity} onChange={(value) => set((draft) => { const row = draft.drops.find((item) => item.id === drop.id); if (row) row.quantity = value; })} />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 inline-flex h-11 items-center gap-2 text-sm text-ember" onClick={() => set((draft) => { draft.drops.push({ id: newId(), item: "Coal", quantity: 1, chance: 0.5 }); })}>
          <Plus className="size-4" /> Add drop
        </button>
      </Fold>

      <Fold id="section-abilities" title="Abilities" open={focus === "abilities"}>
        <ul className="space-y-3">
          {spec.abilities.map((ability) => (
            <li key={ability.id} className="space-y-3 rounded-md border border-line p-3">
              <div className="flex gap-2">
                <input className={inputClass} value={ability.name} onChange={(event) => set((draft) => { const row = draft.abilities.find((item) => item.id === ability.id); if (row) row.name = event.target.value; })} />
                <button type="button" aria-label="Remove ability" className="grid size-11 shrink-0 place-items-center rounded-md border border-line" onClick={() => set((draft) => { draft.abilities = draft.abilities.filter((item) => item.id !== ability.id); })}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <select className={inputClass} value={ability.type} onChange={(event) => set((draft) => { const row = draft.abilities.find((item) => item.id === ability.id); if (row) row.type = event.target.value as AbilityType; })}>
                <option value="projectile">Projectile</option>
                <option value="melee">Melee</option>
                <option value="aura">Aura</option>
                <option value="summon">Summon</option>
                <option value="passive">Passive</option>
              </select>
              <textarea className={`${inputClass} h-20 py-2`} value={ability.detail} onChange={(event) => set((draft) => { const row = draft.abilities.find((item) => item.id === ability.id); if (row) row.detail = event.target.value; })} />
              <Slider label="Cooldown" min={0} max={30} step={0.5} value={ability.cooldown} suffix="s" onChange={(value) => set((draft) => { const row = draft.abilities.find((item) => item.id === ability.id); if (row) row.cooldown = value; })} />
              <Slider label="Damage" min={0} max={40} step={1} value={ability.damage} onChange={(value) => set((draft) => { const row = draft.abilities.find((item) => item.id === ability.id); if (row) row.damage = value; })} />
              <Slider label="Range" min={1} max={32} step={1} value={ability.range} onChange={(value) => set((draft) => { const row = draft.abilities.find((item) => item.id === ability.id); if (row) row.range = value; })} />
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 inline-flex h-11 items-center gap-2 text-sm text-ember" onClick={() => set((draft) => { draft.abilities.push({ id: newId(), name: "New ability", type: "passive", detail: "", cooldown: 4, damage: 4, range: 8 }); })}>
          <Plus className="size-4" /> Add ability
        </button>
      </Fold>

      <Fold id="section-appearance" title="Appearance" open={focus === "appearance"}>
        <label className="block text-sm text-muted">
          Material
          <input className={`${inputClass} mt-1`} value={spec.appearance.material} onChange={(event) => set((draft) => { draft.appearance.material = event.target.value; })} />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ColorField label="Body" value={spec.appearance.primary} onChange={(value) => set((draft) => { draft.appearance.primary = value; })} />
          <ColorField label="Trim" value={spec.appearance.secondary} onChange={(value) => set((draft) => { draft.appearance.secondary = value; })} />
          <ColorField label="Glow" value={spec.appearance.glow} onChange={(value) => set((draft) => { draft.appearance.glow = value; })} />
        </div>
        <label className="mt-3 block text-sm text-muted">
          Notes
          <textarea className={`${inputClass} mt-1 h-20 py-2`} value={spec.appearance.notes} onChange={(event) => set((draft) => { draft.appearance.notes = event.target.value; })} />
        </label>
      </Fold>

      <Fold id="section-sound" title="Sound and motion" open={focus === "sound"}>
        <label className="block text-sm text-muted">
          Sound
          <input className={`${inputClass} mt-1`} value={spec.sound} onChange={(event) => set((draft) => { draft.sound = event.target.value; })} />
        </label>
        <label className="mt-3 block text-sm text-muted">
          Animation
          <input className={`${inputClass} mt-1`} value={spec.animation} onChange={(event) => set((draft) => { draft.animation = event.target.value; })} />
        </label>
      </Fold>
      <p className="text-sm text-faint">Hand edits are free. They update this version in place.</p>
    </div>
  );
}

function Fold({ id, title, open, children }: { id: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} open={open} className="rounded-md border border-line bg-surface">
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold">{title}</summary>
      <div className="space-y-3 border-t border-line px-3 py-3">{children}</div>
    </details>
  );
}

function placesFor(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
}

function roundTo(value: number, step: number): number {
  const factor = 10 ** placesFor(step);
  return Math.round(value * factor) / factor;
}

function Slider({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  const places = placesFor(step);
  const shown = roundTo(value, step).toFixed(places);
  const commit = (next: number) => {
    if (!Number.isFinite(next)) return;
    onChange(Math.min(max, Math.max(min, roundTo(next, step))));
  };
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm text-muted">
        {label}
        <span className="inline-flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={shown}
            onChange={(event) => commit(Number(event.target.value))}
            className="h-9 w-20 rounded-md border border-line bg-bg px-2 text-right text-fg tabular-nums"
          />
          {suffix ? <span>{suffix}</span> : null}
        </span>
      </span>
      <input
        type="range"
        className="mt-2 w-full accent-ember"
        min={min}
        max={max}
        step={step}
        value={roundTo(value, step)}
        aria-label={label}
        onChange={(event) => commit(Number(event.target.value))}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#c4a574";
  return (
    <label className="text-sm text-muted">
      {label}
      <input type="color" value={safe} aria-label={label} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full cursor-pointer rounded-md border border-line bg-bg" />
    </label>
  );
}
