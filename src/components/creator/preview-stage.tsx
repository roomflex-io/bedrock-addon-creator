import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { Spec } from "@/lib/forge/types";
import { figureCubes } from "@/lib/forge/figure";

type PreviewProps = {
  spec: Spec | null;
  shaping: boolean;
  idea?: string;
};

export function PreviewStage({ spec, shaping, idea }: PreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const specRef = useRef(spec);
  specRef.current = spec;
  const [ready, setReady] = useState(false);
  const controls = useRef({ yaw: 0.5, zoom: 1, dragging: false, x: 0 });

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let stop = false;
    let cleanup = () => {};
    void (async () => {
      const THREE = await import("three");
      if (stop || !mountRef.current) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.domElement.className = "absolute inset-0 h-full w-full";
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x14120e, 8, 18);
      const camera = new THREE.PerspectiveCamera(35, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 40);
      camera.position.set(0, 1.6, 7);
      const ambient = new THREE.AmbientLight(0xf4efe4, 0.55);
      const key = new THREE.DirectionalLight(0xffe2b0, 1.4);
      key.position.set(3, 6, 4);
      const fill = new THREE.PointLight(0xe39b3a, 6, 12);
      fill.position.set(-2, 1.5, 2);
      scene.add(ambient, key, fill);
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 48),
        new THREE.MeshStandardMaterial({ color: 0x1c1914, roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      const rig = new THREE.Group();
      scene.add(rig);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let signature = "";

      const disposeRig = () => {
        rig.traverse((object) => {
          const mesh = object as { geometry?: { dispose: () => void }; material?: { dispose: () => void } | { dispose: () => void }[] };
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material?.dispose();
        });
        while (rig.children.length > 0) rig.remove(rig.children[0]!);
      };

      const rebuild = () => {
        const current = specRef.current;
        const next = current
          ? `${current.name}|${current.silhouette}|${current.scale}|${current.appearance.primary}|${current.appearance.secondary}|${current.appearance.glow}`
          : "";
        if (next === signature) return;
        signature = next;
        disposeRig();
        if (!current) return;
        const primary = new THREE.MeshStandardMaterial({ color: current.appearance.primary, roughness: 0.72 });
        const secondary = new THREE.MeshStandardMaterial({ color: current.appearance.secondary, roughness: 0.8 });
        const glow = new THREE.MeshStandardMaterial({
          color: current.appearance.glow,
          emissive: current.appearance.glow,
          emissiveIntensity: 0.85,
          roughness: 0.35,
        });
        const scale = current.scale / 16;
        const figure = new THREE.Group();
        for (const part of figureCubes(current)) {
          const material = part.tone === "glow" ? glow : part.tone === "secondary" ? secondary : primary;
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(part.size[0] * scale, part.size[1] * scale, part.size[2] * scale),
            material,
          );
          mesh.position.set(
            (part.origin[0] + part.size[0] / 2) * scale,
            (part.origin[1] + part.size[1] / 2) * scale,
            (part.origin[2] + part.size[2] / 2) * scale,
          );
          mesh.name = part.name;
          figure.add(mesh);
        }
        rig.add(figure);
        fill.color.set(current.appearance.glow);
      };

      rebuild();
      setReady(true);
      const clock = new THREE.Clock();
      let frame = 0;
      const loop = () => {
        rebuild();
        const t = clock.getElapsedTime();
        const current = specRef.current;
        rig.rotation.y = controls.current.yaw + (reduced || controls.current.dragging ? 0 : t * 0.25);
        rig.position.y = reduced ? 0 : Math.sin(t * 1.6) * 0.04;
        const armL = rig.getObjectByName("armLeft");
        const armR = rig.getObjectByName("armRight");
        const wingL = rig.getObjectByName("wingLeft");
        const wingR = rig.getObjectByName("wingRight");
        if (armL && armR && !reduced) {
          armL.rotation.x = Math.sin(t * 1.8) * 0.25;
          armR.rotation.x = -Math.sin(t * 1.8) * 0.25;
        }
        if (wingL && wingR && !reduced) {
          wingL.rotation.z = Math.sin(t * 2.2) * 0.15;
          wingR.rotation.z = -Math.sin(t * 2.2) * 0.15;
        }
        const distance = (current?.silhouette === "dragon" ? 12 : 8) / controls.current.zoom;
        camera.position.z = distance;
        camera.lookAt(0, current?.silhouette === "blade" ? 1.4 : 1.1, 0);
        renderer.render(scene, camera);
        frame = requestAnimationFrame(loop);
      };
      loop();
      const resize = () => {
        if (!host) return;
        camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      const onPointerDown = (event: PointerEvent) => {
        controls.current.dragging = true;
        controls.current.x = event.clientX;
      };
      const onPointerUp = () => {
        controls.current.dragging = false;
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!controls.current.dragging) return;
        const dx = event.clientX - controls.current.x;
        controls.current.x = event.clientX;
        controls.current.yaw += dx * 0.01;
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointermove", onPointerMove);

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointermove", onPointerMove);
        renderer.dispose();
        host.removeChild(renderer.domElement);
      };
    })();
    return () => {
      stop = true;
      cleanup();
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-80 flex-col bg-bg">
      <div ref={mountRef} className="relative min-h-0 flex-1">
        {!ready && spec ? <CssFigure spec={spec} /> : null}
        {!spec ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="font-display text-3xl text-fg">Shaping</p>
              {idea ? <p className="mx-auto mt-3 max-w-md text-muted">{idea}</p> : null}
            </div>
          </div>
        ) : null}
        {shaping && spec ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-raised/90 px-3 py-1 text-sm text-ember">
            Shaping the change
          </div>
        ) : null}
      </div>
      {spec ? (
        <div className="flex items-end justify-between gap-3 border-t border-line px-4 py-3">
          <div>
            <p className="font-display text-2xl">{spec.name}</p>
            <p className="max-w-md text-sm text-muted">{spec.summary}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Zoom out" className="grid size-11 place-items-center rounded-md border border-line" onClick={() => { controls.current.zoom = Math.max(0.6, controls.current.zoom - 0.15); }}>
              <Minus className="size-4" />
            </button>
            <button type="button" aria-label="Zoom in" className="grid size-11 place-items-center rounded-md border border-line" onClick={() => { controls.current.zoom = Math.min(1.8, controls.current.zoom + 0.15); }}>
              <Plus className="size-4" />
            </button>
            <button type="button" aria-label="Reset view" className="grid size-11 place-items-center rounded-md border border-line" onClick={() => { controls.current.yaw = 0.5; controls.current.zoom = 1; }}>
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CssFigure({ spec }: { spec: Spec }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="grid justify-items-center gap-1" style={{ transform: `scale(${Math.min(spec.scale, 2)})` }}>
        <div className="h-8 w-8 rounded-md" style={{ background: spec.appearance.secondary }} />
        <div className="h-16 w-14 rounded-md" style={{ background: spec.appearance.primary }} />
        <div className="h-2 w-8 rounded-full" style={{ background: spec.appearance.glow }} />
      </div>
    </div>
  );
}
