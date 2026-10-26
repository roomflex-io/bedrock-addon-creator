import { useEffect, useRef } from "react";
import { figureCubes } from "@/lib/forge/figure";
import type { Spec } from "@/lib/forge/types";

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function paint(color: [number, number, number], amount: number): string {
  return `rgb(${color.map((channel) => Math.max(0, Math.min(255, Math.round(channel * amount)))).join(",")})`;
}

function project(x: number, y: number, z: number) {
  return { x: (x - z) * 0.86, y: -y + (x + z) * 0.42 };
}

export function FigureStill({ spec, className }: { spec: Spec; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const signature = `${spec.name}|${spec.silhouette}|${spec.scale}|${spec.appearance.primary}|${spec.appearance.secondary}|${spec.appearance.glow}`;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#14120e";
    ctx.fillRect(0, 0, width, height);

    const cubes = figureCubes(spec);
    const points = cubes.flatMap((cube) => {
      const [x, y, z] = cube.origin;
      const [w, h, d] = cube.size;
      return [
        project(x, y, z),
        project(x + w, y + h, z + d),
      ];
    });
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const scale = Math.min((width * 0.78) / (maxX - minX || 1), (height * 0.78) / (maxY - minY || 1));
    const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = height / 2 - ((minY + maxY) / 2) * scale;
    const to = (x: number, y: number, z: number) => {
      const point = project(x, y, z);
      return { x: offsetX + point.x * scale, y: offsetY + point.y * scale };
    };

    const tones = {
      primary: rgb(spec.appearance.primary),
      secondary: rgb(spec.appearance.secondary),
      glow: rgb(spec.appearance.glow),
    };

    for (const cube of [...cubes].sort((a, b) => b.origin[2] - a.origin[2] || a.origin[1] - b.origin[1])) {
      const [x, y, z] = cube.origin;
      const [w, h, d] = cube.size;
      const color = tones[cube.tone];
      const lit = cube.tone === "primary" ? [2.2, 3.2, 4] : cube.tone === "glow" ? [0.72, 1.05, 1.2] : [0.7, 1, 1.25];
      const faces = [
        { fill: paint(color, lit[0]), path: [to(x + w, y, z), to(x + w, y, z + d), to(x + w, y + h, z + d), to(x + w, y + h, z)] },
        { fill: paint(color, lit[1]), path: [to(x, y, z), to(x + w, y, z), to(x + w, y + h, z), to(x, y + h, z)] },
        { fill: paint(color, lit[2]), path: [to(x, y + h, z), to(x + w, y + h, z), to(x + w, y + h, z + d), to(x, y + h, z + d)] },
      ];
      for (const face of faces) {
        ctx.beginPath();
        face.path.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
        ctx.closePath();
        ctx.fillStyle = face.fill;
        ctx.fill();
      }
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [signature, spec]);

  return <canvas ref={ref} className={className} />;
}
