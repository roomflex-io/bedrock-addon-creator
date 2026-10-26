import type { Spec } from "./types";

export type FigureCube = {
  name: string;
  origin: [number, number, number];
  size: [number, number, number];
  tone: "primary" | "secondary" | "glow";
};

function cube(
  name: string,
  origin: [number, number, number],
  size: [number, number, number],
  tone: FigureCube["tone"] = "primary",
): FigureCube {
  return { name, origin, size, tone };
}

function dragon(): FigureCube[] {
  return [
    cube("body", [-6, 12, -12], [12, 8, 22]),
    cube("chest", [-5, 14, 4], [10, 6, 8], "secondary"),
    cube("neck", [-3, 16, 8], [6, 5, 8]),
    cube("head", [-4, 17, 14], [8, 7, 10]),
    cube("snout", [-2, 17, 22], [4, 3, 6], "secondary"),
    cube("jaw", [-2, 15, 20], [4, 2, 6], "secondary"),
    cube("hornLeft", [2, 23, 16], [2, 6, 2], "glow"),
    cube("hornRight", [-4, 23, 16], [2, 6, 2], "glow"),
    cube("eyeLeft", [2, 20, 23], [2, 2, 1], "glow"),
    cube("eyeRight", [-4, 20, 23], [2, 2, 1], "glow"),
    cube("wingArmLeft", [6, 18, -2], [16, 2, 3], "secondary"),
    cube("wingArmRight", [-22, 18, -2], [16, 2, 3], "secondary"),
    cube("wingLeft", [8, 16, -8], [18, 1, 14], "secondary"),
    cube("wingRight", [-26, 16, -8], [18, 1, 14], "secondary"),
    cube("legFrontLeft", [3, 4, 6], [3, 8, 3]),
    cube("legFrontRight", [-6, 4, 6], [3, 8, 3]),
    cube("legBackLeft", [3, 4, -8], [3, 8, 4]),
    cube("legBackRight", [-6, 4, -8], [3, 8, 4]),
    cube("tail", [-3, 13, -22], [6, 4, 12]),
    cube("tailTip", [-2, 14, -30], [4, 3, 8], "glow"),
  ];
}

function beast(): FigureCube[] {
  return [
    cube("body", [-8, 8, -10], [16, 9, 20]),
    cube("shoulder", [-7, 14, 2], [14, 4, 8], "secondary"),
    cube("neck", [-4, 12, 8], [8, 6, 6]),
    cube("head", [-5, 14, 12], [10, 8, 10]),
    cube("muzzle", [-3, 14, 20], [6, 4, 6], "secondary"),
    cube("earLeft", [3, 21, 14], [2, 4, 2]),
    cube("earRight", [-5, 21, 14], [2, 4, 2]),
    cube("eyeLeft", [2, 18, 21], [2, 2, 1], "glow"),
    cube("eyeRight", [-4, 18, 21], [2, 2, 1], "glow"),
    cube("legFrontLeft", [4, 0, 6], [4, 9, 4]),
    cube("legFrontRight", [-8, 0, 6], [4, 9, 4]),
    cube("legBackLeft", [4, 0, -8], [4, 9, 4]),
    cube("legBackRight", [-8, 0, -8], [4, 9, 4]),
    cube("tail", [-2, 10, -18], [4, 3, 10], "secondary"),
  ];
}

function humanoid(): FigureCube[] {
  return [
    cube("body", [-8, 12, -5], [16, 14, 10]),
    cube("core", [-3, 16, -7], [6, 6, 2], "glow"),
    cube("head", [-4, 26, -4], [8, 8, 8]),
    cube("brow", [-4, 30, -5], [8, 2, 2], "secondary"),
    cube("eyeLeft", [1, 29, -5], [2, 2, 1], "glow"),
    cube("eyeRight", [-3, 29, -5], [2, 2, 1], "glow"),
    cube("pauldronLeft", [8, 24, -4], [6, 4, 8], "secondary"),
    cube("pauldronRight", [-14, 24, -4], [6, 4, 8], "secondary"),
    cube("armLeft", [8, 10, -3], [5, 14, 6]),
    cube("armRight", [-13, 10, -3], [5, 14, 6]),
    cube("fistLeft", [7, 5, -4], [7, 6, 8], "secondary"),
    cube("fistRight", [-14, 5, -4], [7, 6, 8], "secondary"),
    cube("legLeft", [1, 0, -3], [6, 12, 6]),
    cube("legRight", [-7, 0, -3], [6, 12, 6]),
  ];
}

function blade(): FigureCube[] {
  return [
    cube("grip", [-1, 0, -1], [2, 8, 2], "secondary"),
    cube("guard", [-5, 8, -1], [10, 2, 2], "secondary"),
    cube("blade", [-2, 10, -1], [4, 22, 2]),
    cube("edge", [-1, 12, -2], [2, 18, 1], "glow"),
    cube("pommel", [-2, -2, -2], [4, 2, 4], "glow"),
  ];
}

function block(): FigureCube[] {
  return [
    cube("body", [-8, 0, -8], [16, 16, 16]),
    cube("inset", [-4, 4, -9], [8, 8, 2], "glow"),
    cube("cap", [-6, 16, -6], [12, 3, 12], "secondary"),
  ];
}

function lava(): FigureCube[] {
  return [
    cube("body", [-9, 11, -5], [18, 16, 10]),
    cube("core", [-3, 15, -7], [6, 7, 2], "glow"),
    cube("head", [-4, 25, -4], [8, 8, 8]),
    cube("crest", [-1, 32, -2], [2, 4, 3], "glow"),
    cube("eyeLeft", [1, 28, -5], [2, 2, 1], "glow"),
    cube("eyeRight", [-3, 28, -5], [2, 2, 1], "glow"),
    cube("pauldronLeft", [8, 24, -4], [8, 4, 8], "secondary"),
    cube("pauldronRight", [-16, 24, -4], [8, 4, 8], "secondary"),
    cube("armLeft", [9, 10, -3], [6, 16, 6]),
    cube("armRight", [-15, 10, -3], [6, 16, 6]),
    cube("fistLeft", [8, 5, -4], [8, 6, 8], "glow"),
    cube("fistRight", [-16, 5, -4], [8, 6, 8], "glow"),
    cube("legLeft", [2, 0, -3], [6, 11, 6]),
    cube("legRight", [-8, 0, -3], [6, 11, 6]),
  ];
}

export function figureCubes(spec: Spec): FigureCube[] {
  if (spec.name.trim().toLowerCase() === "lava golem") return lava();
  if (spec.silhouette === "dragon") return dragon();
  if (spec.silhouette === "beast") return beast();
  if (spec.silhouette === "blade") return blade();
  if (spec.silhouette === "block" || spec.silhouette === "orb") return block();
  return humanoid();
}
