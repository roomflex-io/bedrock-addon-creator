import { identifier, slugify } from "./spec";
import { isLavaGolem, lavaGolemAnimation, lavaGolemCombat, lavaGolemGeometry, lavaGolemParticle } from "./golem";
import type { Ability, PackIds, Spec } from "./types";

export type PackFile = {
  path: string;
  group: "Behaviour pack" | "Resource pack";
  title: string;
  text: string;
};

const VANILLA: Record<string, string> = {
  coal: "minecraft:coal",
  diamond: "minecraft:diamond",
  emerald: "minecraft:emerald",
  iron: "minecraft:iron_ingot",
  "iron ingot": "minecraft:iron_ingot",
  gold: "minecraft:gold_ingot",
  "gold ingot": "minecraft:gold_ingot",
  gunpowder: "minecraft:gunpowder",
  bone: "minecraft:bone",
  string: "minecraft:string",
  leather: "minecraft:leather",
  "blaze rod": "minecraft:blaze_rod",
  "nether star": "minecraft:nether_star",
  prismarine: "minecraft:prismarine_shard",
  arrow: "minecraft:arrow",
  stick: "minecraft:stick",
};

function itemId(name: string): string {
  const key = name.trim().toLowerCase();
  return VANILLA[key] ?? identifier(name);
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function header(
  name: string,
  description: string,
  uuid: string,
  moduleUuid: string,
  moduleType: "data" | "resources",
  dependency?: string,
) {
  return {
    format_version: 2,
    header: {
      name,
      description,
      uuid,
      version: [1, 0, 0],
      min_engine_version: [1, 21, 0],
    },
    modules: [{ type: moduleType, uuid: moduleUuid, version: [1, 0, 0] }],
    dependencies: dependency ? [{ uuid: dependency, version: [1, 0, 0] }] : [],
  };
}

function projectileOf(ability: Ability | undefined): string | null {
  if (!ability || ability.type !== "projectile") return null;
  const hay = `${ability.name} ${ability.detail}`.toLowerCase();
  if (hay.includes("dragon")) return "minecraft:dragon_fireball";
  if (hay.includes("wither") || hay.includes("skull")) return "minecraft:wither_skull";
  if (hay.includes("snow")) return "minecraft:snowball";
  if (hay.includes("shulker")) return "minecraft:shulker_bullet";
  if (hay.includes("arrow")) return "minecraft:arrow";
  if (hay.includes("lightning")) return "minecraft:small_fireball";
  return "minecraft:small_fireball";
}

function entityBehavior(spec: Spec): unknown {
  const id = identifier(spec.name);
  const ranged = spec.abilities.find((ability) => ability.type === "projectile");
  const shot = projectileOf(ranged);
  const components: Record<string, unknown> = {
    "minecraft:type_family": {
      family: ["anvil", slugify(spec.name), spec.behavior === "passive" ? "animal" : "monster"],
    },
    "minecraft:health": { value: spec.health, max: spec.health },
    "minecraft:attack": { damage: spec.damage },
    "minecraft:movement": { value: spec.movementSpeed },
    "minecraft:scale": { value: spec.scale },
    "minecraft:collision_box": {
      width: Math.round(spec.scale * 0.9 * 100) / 100,
      height: Math.round(spec.scale * 1.8 * 100) / 100,
    },
    "minecraft:physics": {},
    "minecraft:pushable": { is_pushable: true, is_pushable_by_piston: true },
    "minecraft:navigation.walk": { can_path_over_water: spec.behavior === "passive" },
    "minecraft:movement.basic": {},
    "minecraft:jump.static": {},
    "minecraft:behavior.random_stroll": { priority: 6, speed_multiplier: 1 },
    "minecraft:behavior.look_at_player": { priority: 7, look_distance: 8 },
    "minecraft:behavior.random_look_around": { priority: 8 },
  };

  if (spec.behavior !== "passive") {
    const filters: unknown[] = [{ test: "is_family", subject: "other", value: "player" }];
    if (spec.friendlyByDay) filters.push({ test: "is_daytime", value: false });
    components["minecraft:behavior.nearest_attackable_target"] = {
      priority: 2,
      must_see: true,
      reselect_targets: true,
      entity_types: [{ filters: { all_of: filters }, max_dist: 16 }],
    };
    components["minecraft:behavior.hurt_by_target"] = { priority: 1 };
    components["minecraft:behavior.melee_attack"] = { priority: 4, speed_multiplier: 1.1, track_target: true };
  }
  if (shot && ranged) {
    components["minecraft:shooter"] = { def: shot };
    components["minecraft:behavior.ranged_attack"] = {
      priority: 2,
      attack_radius: ranged.range,
      attack_interval_min: Math.max(0.5, ranged.cooldown * 0.8),
      attack_interval_max: Math.max(1, ranged.cooldown),
      charge_shoot_trigger: 0,
      ranged_fov: 90,
    };
  }
  if (spec.drops.length > 0) {
    components["minecraft:loot"] = { table: `loot_tables/entities/${slugify(spec.name)}.json` };
  }
  if (isLavaGolem(spec)) {
    const walk = components["minecraft:navigation.walk"] as { can_path_over_lava?: boolean; avoid_damage_blocks?: boolean };
    walk.can_path_over_lava = true;
    walk.avoid_damage_blocks = false;
    Object.assign(components, lavaGolemCombat());
  }

  return {
    format_version: "1.21.0",
    "minecraft:entity": {
      description: {
        identifier: id,
        is_spawnable: true,
        is_summonable: true,
        is_experimental: false,
      },
      components,
    },
  };
}

function itemBehavior(spec: Spec): unknown {
  const weapon = spec.type === "weapon";
  const components: Record<string, unknown> = {
    "minecraft:icon": `anvil_${slugify(spec.name)}`,
    "minecraft:display_name": { value: spec.name },
    "minecraft:max_stack_size": weapon ? 1 : 16,
    "minecraft:hand_equipped": weapon,
    "minecraft:durability": { max_durability: spec.health },
  };
  if (weapon) components["minecraft:damage"] = spec.damage;
  return {
    format_version: "1.21.0",
    "minecraft:item": {
      description: { identifier: identifier(spec.name) },
      components,
    },
  };
}

function blockBehavior(spec: Spec): unknown {
  const material = spec.appearance.material.toLowerCase();
  const glow = material.includes("lantern") || material.includes("lava") || material.includes("glow");
  return {
    format_version: "1.21.0",
    "minecraft:block": {
      description: {
        identifier: identifier(spec.name),
        menu_category: { category: "construction" },
      },
      components: {
        "minecraft:destructible_by_mining": { seconds_to_destroy: Math.max(0.3, spec.health / 40) },
        "minecraft:destructible_by_explosion": { explosion_resistance: Math.max(1, spec.damage || 6) },
        "minecraft:light_emission": glow ? 12 : 0,
        "minecraft:material_instances": {
          "*": { texture: `anvil_${slugify(spec.name)}`, render_method: "opaque" },
        },
      },
    },
  };
}

function geometry(spec: Spec): unknown {
  if (isLavaGolem(spec)) return lavaGolemGeometry();
  const bones =
    spec.silhouette === "blade"
      ? [
          { name: "body", pivot: [0, 0, 0], cubes: [{ origin: [-1, 0, -1], size: [2, 14, 2], uv: [0, 0] }] },
          { name: "edge", pivot: [0, 14, 0], cubes: [{ origin: [-2, 14, -1], size: [4, 16, 2], uv: [16, 0] }] },
        ]
      : spec.silhouette === "orb" || spec.silhouette === "block"
        ? [{ name: "body", pivot: [0, 8, 0], cubes: [{ origin: [-6, 2, -6], size: [12, 12, 12], uv: [0, 0] }] }]
        : spec.silhouette === "dragon"
          ? [
              { name: "body", pivot: [0, 14, 0], cubes: [{ origin: [-6, 10, -10], size: [12, 8, 20], uv: [0, 0] }] },
              { name: "head", pivot: [0, 16, 10], cubes: [{ origin: [-4, 14, 8], size: [8, 6, 10], uv: [0, 28] }] },
              { name: "wingLeft", pivot: [6, 16, 0], cubes: [{ origin: [6, 14, -8], size: [14, 1, 12], uv: [32, 0] }] },
              { name: "wingRight", pivot: [-6, 16, 0], cubes: [{ origin: [-20, 14, -8], size: [14, 1, 12], uv: [32, 14] }] },
            ]
          : [
              { name: "body", pivot: [0, 12, 0], cubes: [{ origin: [-6, 10, -4], size: [12, 14, 8], uv: [0, 0] }] },
              { name: "head", pivot: [0, 24, 0], cubes: [{ origin: [-4, 22, -4], size: [8, 8, 8], uv: [32, 0] }] },
              { name: "armLeft", pivot: [6, 22, 0], cubes: [{ origin: [6, 8, -2], size: [4, 14, 4], uv: [0, 32] }] },
              { name: "armRight", pivot: [-6, 22, 0], cubes: [{ origin: [-10, 8, -2], size: [4, 14, 4], uv: [16, 32] }] },
              { name: "legLeft", pivot: [3, 10, 0], cubes: [{ origin: [1, 0, -2], size: [4, 10, 4], uv: [32, 32] }] },
              { name: "legRight", pivot: [-3, 10, 0], cubes: [{ origin: [-5, 0, -2], size: [4, 10, 4], uv: [48, 32] }] },
            ];

  return {
    format_version: "1.12.0",
    "minecraft:geometry": [
      {
        description: {
          identifier: `geometry.anvil.${slugify(spec.name)}`,
          texture_width: 64,
          texture_height: 64,
          visible_bounds_width: 4,
          visible_bounds_height: 4,
          visible_bounds_offset: [0, 1, 0],
        },
        bones,
      },
    ],
  };
}

function biomeTag(where: string): string {
  const hay = where.toLowerCase();
  if (hay.includes("nether") || hay.includes("lava") || hay.includes("crimson") || hay.includes("soul sand")) return "nether";
  if (hay.includes("end")) return "the_end";
  if (hay.includes("ocean") || hay.includes("beach")) return "ocean";
  if (hay.includes("mountain") || hay.includes("peak")) return "mountains";
  if (hay.includes("desert")) return "desert";
  if (hay.includes("forest") || hay.includes("jungle") || hay.includes("swamp")) return "forest";
  return "overworld";
}

function weightFor(rarity: Spec["spawn"]["rarity"]): number {
  if (rarity === "common") return 20;
  if (rarity === "uncommon") return 8;
  if (rarity === "rare") return 3;
  return 1;
}

export function buildTextFiles(spec: Spec, packIds: PackIds): PackFile[] {
  const slug = slugify(spec.name);
  const bp = `behavior_packs/${slug}_bp`;
  const rp = `resource_packs/${slug}_rp`;
  const id = identifier(spec.name);
  const files: PackFile[] = [];
  const push = (path: string, group: PackFile["group"], title: string, value: unknown) => {
    files.push({ path, group, title, text: typeof value === "string" ? value : pretty(value) });
  };

  push(
    `${bp}/manifest.json`,
    "Behaviour pack",
    "Manifest",
    header(`${spec.name} behaviour`, spec.summary, packIds.behavior, packIds.behaviorModule, "data", packIds.resource),
  );
  push(
    `${rp}/manifest.json`,
    "Resource pack",
    "Manifest",
    header(
      `${spec.name} resources`,
      `Look for ${spec.name}.`,
      packIds.resource,
      packIds.resourceModule,
      "resources",
      packIds.behavior,
    ),
  );

  if (spec.type === "mob") {
    push(`${bp}/entities/${slug}.json`, "Behaviour pack", "Creature", entityBehavior(spec));
    if (spec.drops.length > 0) {
      push(`${bp}/loot_tables/entities/${slug}.json`, "Behaviour pack", "Drops", {
        pools: [
          {
            rolls: 1,
            entries: spec.drops.map((drop) => ({
              type: "item",
              name: itemId(drop.item),
              weight: Math.max(1, Math.round(drop.chance * 10)),
              functions: [{ function: "set_count", count: drop.quantity }],
            })),
          },
        ],
      });
    }
    const biome = biomeTag(spec.spawn.where);
    push(`${bp}/spawn_rules/${slug}.json`, "Behaviour pack", "Spawning", {
      format_version: "1.8.0",
      "minecraft:spawn_rules": {
        description: {
          identifier: id,
          population_control: spec.behavior === "passive" ? "animal" : "monster",
        },
        conditions: [
          {
            "minecraft:spawns_on_surface": {},
            "minecraft:brightness_filter": {
              min: 0,
              max: biome === "nether" || spec.behavior === "passive" ? 15 : 7,
              adjust_for_weather: true,
            },
            "minecraft:weight": { default: weightFor(spec.spawn.rarity) },
            "minecraft:herd": { min_size: 1, max_size: spec.spawn.rarity === "legendary" ? 1 : 2 },
            "minecraft:biome_filter": { test: "has_biome_tag", operator: "==", value: biome },
          },
        ],
      },
    });
    push(`${bp}/items/${slug}_spawn_egg.json`, "Behaviour pack", "Spawn egg", {
      format_version: "1.21.30",
      "minecraft:item": {
        description: {
          identifier: `${id}_spawn_egg`,
          menu_category: { category: "nature" },
        },
        components: {
          "minecraft:icon": `anvil_${slug}_spawn_egg`,
          "minecraft:display_name": { value: `${spec.name} Spawn Egg` },
          "minecraft:max_stack_size": 64,
          "minecraft:entity_placer": { entity: id },
        },
      },
    });
    push(`${rp}/textures/item_texture.json`, "Resource pack", "Spawn egg texture", {
      resource_pack_name: "anvil",
      texture_name: "atlas.items",
      texture_data: { [`anvil_${slug}_spawn_egg`]: { textures: `textures/items/${slug}_spawn_egg` } },
    });
    push(`${rp}/entity/${slug}.entity.json`, "Resource pack", "Appearance", {
      format_version: "1.10.0",
      "minecraft:client_entity": {
        description: {
          identifier: id,
          materials: { default: isLavaGolem(spec) ? "entity_emissive_alpha" : "entity_alphatest" },
          textures: { default: `textures/entity/${slug}` },
          geometry: { default: `geometry.anvil.${slug}` },
          render_controllers: [`controller.render.anvil.${slug}`],
          animations: { idle: `animation.anvil.${slug}.idle` },
          ...(isLavaGolem(spec) ? { particle_effects: { ember: "anvil:lava_ember" } } : {}),
          scripts: { animate: ["idle"] },
        },
      },
    });
    push(`${rp}/models/entity/${slug}.geo.json`, "Resource pack", "Model", geometry(spec));
    push(
      `${rp}/animations/${slug}.animation.json`,
      "Resource pack",
      "Animation",
      isLavaGolem(spec)
        ? lavaGolemAnimation()
        : {
            format_version: "1.8.0",
            animations: {
              [`animation.anvil.${slug}.idle`]: {
                loop: true,
                animation_length: 2,
                bones: { body: { rotation: { "0.0": [0, 0, 0], "1.0": [4, 0, 0], "2.0": [0, 0, 0] } } },
              },
            },
          },
    );
    if (isLavaGolem(spec)) {
      push(`${rp}/particles/lava_ember.particle.json`, "Resource pack", "Embers", lavaGolemParticle());
    }
    push(`${rp}/render_controllers/${slug}.render.json`, "Resource pack", "Render", {
      format_version: "1.8.0",
      render_controllers: {
        [`controller.render.anvil.${slug}`]: {
          geometry: "Geometry.default",
          materials: [{ "*": "Material.default" }],
          textures: ["Texture.default"],
        },
      },
    });
  } else if (spec.type === "block") {
    push(`${bp}/blocks/${slug}.json`, "Behaviour pack", "Block", blockBehavior(spec));
    push(`${rp}/blocks.json`, "Resource pack", "Block entry", {
      [id]: { textures: `anvil_${slug}`, sound: "stone" },
    });
    push(`${rp}/textures/terrain_texture.json`, "Resource pack", "Terrain texture", {
      resource_pack_name: "anvil",
      texture_name: "atlas.terrain",
      padding: 8,
      num_mip_levels: 4,
      texture_data: { [`anvil_${slug}`]: { textures: `textures/blocks/${slug}` } },
    });
  } else {
    push(
      `${bp}/items/${slug}.json`,
      "Behaviour pack",
      spec.type === "weapon" ? "Weapon" : "Item",
      itemBehavior(spec),
    );
    push(`${rp}/textures/item_texture.json`, "Resource pack", "Item texture", {
      resource_pack_name: "anvil",
      texture_name: "atlas.items",
      texture_data: { [`anvil_${slug}`]: { textures: `textures/items/${slug}` } },
    });
  }

  for (const drop of spec.drops) {
    if (itemId(drop.item).startsWith("minecraft:")) continue;
    const dropSlug = slugify(drop.item);
    push(`${bp}/items/${dropSlug}.json`, "Behaviour pack", `Drop · ${drop.item}`, {
      format_version: "1.21.0",
      "minecraft:item": {
        description: { identifier: identifier(drop.item) },
        components: {
          "minecraft:icon": `anvil_${dropSlug}`,
          "minecraft:display_name": { value: drop.item },
          "minecraft:max_stack_size": 16,
        },
      },
    });
  }

  const names = [`entity.${id}.name=${spec.name}`, `item.${id}.name=${spec.name}`, `tile.${id}.name=${spec.name}`];
  if (spec.type === "mob") names.push(`item.${id}_spawn_egg.name=${spec.name} Spawn Egg`);
  for (const drop of spec.drops) {
    if (!itemId(drop.item).startsWith("minecraft:")) names.push(`item.${identifier(drop.item)}.name=${drop.item}`);
  }
  push(`${rp}/texts/en_US.lang`, "Resource pack", "Names", `${names.join("\n")}\n`);
  push(`${rp}/texts/languages.json`, "Resource pack", "Languages", ["en_US"]);
  return files;
}

export function texturePath(spec: Spec): string {
  const slug = slugify(spec.name);
  const rp = `resource_packs/${slug}_rp`;
  if (spec.type === "mob") return `${rp}/textures/entity/${slug}.png`;
  if (spec.type === "block") return `${rp}/textures/blocks/${slug}.png`;
  return `${rp}/textures/items/${slug}.png`;
}
