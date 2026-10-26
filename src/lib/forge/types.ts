export type CreationKind = "mob" | "item" | "block" | "weapon";

export type Behavior = "hostile" | "neutral" | "passive";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type AbilityType = "projectile" | "summon" | "aura" | "melee" | "passive";

export type Silhouette = "humanoid" | "dragon" | "beast" | "blade" | "orb" | "block";

export type Ability = {
  id: string;
  name: string;
  type: AbilityType;
  detail: string;
  cooldown: number;
  damage: number;
  range: number;
};

export type Drop = {
  id: string;
  item: string;
  quantity: number;
  chance: number;
};

export type Appearance = {
  material: string;
  primary: string;
  secondary: string;
  glow: string;
  notes: string;
};

export type Spec = {
  type: CreationKind;
  name: string;
  summary: string;
  health: number;
  damage: number;
  movementSpeed: number;
  scale: number;
  behavior: Behavior;
  friendlyByDay: boolean;
  silhouette: Silhouette;
  spawn: { where: string; rarity: Rarity };
  drops: Drop[];
  abilities: Ability[];
  appearance: Appearance;
  sound: string;
  animation: string;
};

export type GenerationEntry = {
  id: string;
  label: string;
  note: string;
  createdAt: string;
  source: "create" | "auto" | "restore" | "bench";
  cost: number;
  spec: Spec;
};

export type PackIds = {
  behavior: string;
  resource: string;
  behaviorModule: string;
  resourceModule: string;
};

export type ProjectPhase = "shaping" | "ready" | "error";

export type Project = {
  id: string;
  idea: string;
  createdAt: string;
  updatedAt: string;
  phase: ProjectPhase;
  phaseMessage?: string;
  generationHistory: GenerationEntry[];
  currentId: string;
  packIds: PackIds;
  ownerId?: string;
};

export type Wallet = {
  coins: number;
  grantClaimed: boolean;
  starterGranted: boolean;
};

export type ForgeMode = "create" | "edit";
