import { encodePng } from "./png";
import type { Spec } from "./types";

export function isLavaGolem(spec: Spec): boolean {
  return spec.type === "mob" && spec.name.trim().toLowerCase() === "lava golem";
}

type Rgb = [number, number, number];
type Face = "north" | "south" | "east" | "west" | "up" | "down";

const STONE: Rgb[] = [
  [28, 18, 16],
  [48, 28, 22],
  [72, 36, 24],
  [18, 12, 12],
];
const LAVA: Rgb[] = [
  [255, 92, 18],
  [255, 150, 32],
  [255, 214, 96],
  [255, 244, 210],
];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function crackedStone(x: number, y: number): Rgb {
  const plate = STONE[(Math.floor(x / 3) + Math.floor(y / 4) * 2) % STONE.length]!;
  const vein = (x * 3 + y * 5) % 9 === 0 || (x + y * 2) % 13 === 0;
  const ember = (x * 7 + y) % 17 === 0;
  if (ember) return LAVA[2]!;
  if (vein) return mix(LAVA[0]!, plate, 0.35);
  const shade = (x + y) % 2 === 0 ? 0 : -12;
  return plate.map((channel) => Math.max(0, Math.min(255, channel + shade))) as Rgb;
}

function molten(x: number, y: number, hot: boolean): Rgb {
  const core = hot && x > 1 && y > 1 ? LAVA[3]! : LAVA[(x + y) % 3]!;
  return (x + y) % 4 === 0 ? LAVA[2]! : core;
}

function paint(
  image: Uint8Array,
  width: number,
  uv: [number, number],
  size: [number, number],
  color: (x: number, y: number) => Rgb,
) {
  for (let y = 0; y < size[1]; y++) {
    for (let x = 0; x < size[0]; x++) {
      const px = uv[0] + x;
      const py = uv[1] + y;
      if (px < 0 || py < 0 || px >= width || py >= width) continue;
      const rgb = color(x, y);
      const index = (py * width + px) * 4;
      image[index] = rgb[0];
      image[index + 1] = rgb[1];
      image[index + 2] = rgb[2];
      image[index + 3] = 255;
    }
  }
}

function box(
  origin: [number, number, number],
  size: [number, number, number],
  faces: Partial<Record<Face, [number, number]>>,
) {
  const uv = {
    north: { uv: faces.north ?? [0, 0], uv_size: [size[0], size[1]] },
    south: { uv: faces.south ?? faces.north ?? [0, 0], uv_size: [size[0], size[1]] },
    east: { uv: faces.east ?? faces.north ?? [0, 0], uv_size: [size[2], size[1]] },
    west: { uv: faces.west ?? faces.north ?? [0, 0], uv_size: [size[2], size[1]] },
    up: { uv: faces.up ?? [0, 56], uv_size: [size[0], size[2]] },
    down: { uv: faces.down ?? [0, 56], uv_size: [size[0], size[2]] },
  };
  return { origin, size, uv };
}

export function lavaGolemTexture(): Uint8Array {
  const size = 64;
  const image = new Uint8Array(size * size * 4);
  for (let i = 0; i < image.length; i += 4) {
    image[i] = 28;
    image[i + 1] = 18;
    image[i + 2] = 16;
    image[i + 3] = 255;
  }
  paint(image, size, [0, 0], [18, 16], crackedStone);
  paint(image, size, [20, 0], [10, 16], crackedStone);
  paint(image, size, [32, 0], [8, 8], (x, y) => (y > 2 && y < 6 && (x < 2 || x > 5) ? LAVA[3]! : crackedStone(x, y)));
  paint(image, size, [42, 0], [6, 7], (x, y) => molten(x, y, x > 1 && x < 4 && y > 1 && y < 5));
  paint(image, size, [0, 20], [6, 16], crackedStone);
  paint(image, size, [8, 20], [8, 6], (x, y) => (y < 2 ? LAVA[1]! : crackedStone(x, y)));
  paint(image, size, [18, 20], [6, 11], crackedStone);
  paint(image, size, [0, 40], [8, 4], crackedStone);
  paint(image, size, [0, 46], [16, 8], crackedStone);
  return encodePng(size, size, image);
}

export function lavaGolemGeometry(): unknown {
  return {
    format_version: "1.16.0",
    "minecraft:geometry": [
      {
        description: {
          identifier: "geometry.anvil.lava_golem",
          texture_width: 64,
          texture_height: 64,
          visible_bounds_width: 6,
          visible_bounds_height: 6,
          visible_bounds_offset: [0, 2, 0],
        },
        bones: [
          {
            name: "body",
            pivot: [0, 16, 0],
            cubes: [
              box([-9, 11, -5], [18, 16, 10], { north: [0, 0], south: [0, 0], east: [20, 0], west: [20, 0], up: [0, 46] }),
            ],
          },
          {
            name: "core",
            parent: "body",
            pivot: [0, 18, -6],
            locators: { mouth: [0, 18, -8] },
            cubes: [box([-3, 15, -7], [6, 7, 2], { north: [42, 0], south: [42, 0], east: [42, 0], west: [42, 0], up: [42, 0] })],
          },
          {
            name: "head",
            parent: "body",
            pivot: [0, 26, 0],
            cubes: [box([-4, 25, -4], [8, 8, 8], { north: [32, 0], south: [32, 0], east: [32, 0], west: [32, 0], up: [32, 0] })],
          },
          {
            name: "crest",
            parent: "head",
            pivot: [0, 33, -1],
            cubes: [box([-1, 32, -2], [2, 4, 3], { north: [42, 0], south: [42, 0], east: [42, 0], west: [42, 0], up: [42, 0] })],
          },
          {
            name: "armLeft",
            parent: "body",
            pivot: [10, 24, 0],
            cubes: [box([9, 10, -3], [6, 16, 6], { north: [0, 20], south: [0, 20], east: [0, 20], west: [0, 20] })],
          },
          {
            name: "fistLeft",
            parent: "armLeft",
            pivot: [12, 10, 0],
            cubes: [box([8, 5, -4], [8, 6, 8], { north: [8, 20], south: [8, 20], east: [8, 20], west: [8, 20], up: [8, 20] })],
          },
          {
            name: "armRight",
            parent: "body",
            pivot: [-10, 24, 0],
            cubes: [box([-15, 10, -3], [6, 16, 6], { north: [0, 20], south: [0, 20], east: [0, 20], west: [0, 20] })],
          },
          {
            name: "fistRight",
            parent: "armRight",
            pivot: [-12, 10, 0],
            cubes: [box([-16, 5, -4], [8, 6, 8], { north: [8, 20], south: [8, 20], east: [8, 20], west: [8, 20], up: [8, 20] })],
          },
          {
            name: "legLeft",
            parent: "body",
            pivot: [5, 11, 0],
            cubes: [box([2, 0, -3], [6, 11, 6], { north: [18, 20], south: [18, 20], east: [18, 20], west: [18, 20] })],
          },
          {
            name: "legRight",
            parent: "body",
            pivot: [-5, 11, 0],
            cubes: [box([-8, 0, -3], [6, 11, 6], { north: [18, 20], south: [18, 20], east: [18, 20], west: [18, 20] })],
          },
          {
            name: "pauldronLeft",
            parent: "body",
            pivot: [10, 26, 0],
            cubes: [box([8, 24, -4], [8, 4, 8], { north: [0, 40], south: [0, 40], east: [0, 40], west: [0, 40], up: [0, 40] })],
          },
          {
            name: "pauldronRight",
            parent: "body",
            pivot: [-10, 26, 0],
            cubes: [box([-16, 24, -4], [8, 4, 8], { north: [0, 40], south: [0, 40], east: [0, 40], west: [0, 40], up: [0, 40] })],
          },
        ],
      },
    ],
  };
}

export function lavaGolemAnimation(): unknown {
  return {
    format_version: "1.8.0",
    animations: {
      "animation.anvil.lava_golem.idle": {
        loop: true,
        animation_length: 4,
        bones: {
          body: { rotation: { "0.0": [2, 0, 0], "2.0": [-2, 0, 0], "4.0": [2, 0, 0] } },
          armRight: { rotation: { "0.0": [8, 0, 0], "1.4": [-48, 0, -6], "2.4": [18, 0, 0], "4.0": [8, 0, 0] } },
          armLeft: { rotation: { "0.0": [6, 0, 0], "2.0": [14, 0, 4], "4.0": [6, 0, 0] } },
          head: { rotation: { "0.0": [0, -6, 0], "2.0": [4, 6, 0], "4.0": [0, -6, 0] } },
        },
        particle_effects: {
          "0.0": [{ effect: "ember", locator: "mouth" }],
          "1.3": [{ effect: "ember", locator: "mouth" }],
          "2.6": [{ effect: "ember", locator: "mouth" }],
        },
      },
    },
  };
}

export function lavaGolemParticle(): unknown {
  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: "anvil:lava_ember",
        basic_render_parameters: {
          material: "particles_alpha",
          texture: "textures/particle/particles",
        },
      },
      components: {
        "minecraft:emitter_rate_instant": { num_particles: 6 },
        "minecraft:emitter_lifetime_once": { active_time: 0.2 },
        "minecraft:emitter_shape_sphere": { radius: 0.25, direction: "outwards" },
        "minecraft:particle_lifetime_expression": { max_lifetime: 0.7 },
        "minecraft:particle_initial_speed": 0.6,
        "minecraft:particle_motion_dynamic": { linear_acceleration: [0, 0.4, 0] },
        "minecraft:particle_appearance_billboard": {
          size: [0.18, 0.18],
          facing_camera_mode: "lookat_xyz",
          uv: { texture_width: 128, texture_height: 128, uv: [0, 24], uv_size: [8, 8] },
        },
        "minecraft:particle_appearance_tinting": { color: [1, 0.48, 0.08, 1] },
      },
    },
  };
}

export function lavaGolemCombat(): Record<string, unknown> {
  return {
    "minecraft:fire_immune": {},
    "minecraft:knockback_resistance": { value: 0.9 },
    "minecraft:follow_range": { value: 32, max: 48 },
    "minecraft:breathable": { breathes_air: true, breathes_lava: true },
    "minecraft:behavior.knockback_roar": {
      priority: 3,
      duration: 0.8,
      attack_time: 0.4,
      knockback_damage: 8,
      knockback_horizontal_strength: 3,
      knockback_vertical_strength: 2,
      knockback_range: 5,
      cooldown_time: 9,
    },
  };
}
