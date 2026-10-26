import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { Spec } from "@/lib/forge/types";

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
          ? `${current.silhouette}|${current.scale}|${current.appearance.primary}|${current.appearance.secondary}|${current.appearance.glow}|${current.type}`
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
          emissiveIntensity: 0.7,
          roughness: 0.4,
        });
        const box = (
          w: number,
          h: number,
          d: number,
          material: typeof primary,
          x: number,
          y: number,
          z: number,
        ) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
          mesh.position.set(x, y, z);
          mesh.castShadow = false;
          return mesh;
        };
        const scale = current.scale;
        const figure = new THREE.Group();
        figure.scale.setScalar(scale);
        if (current.silhouette === "dragon") {
          figure.add(box(1.1, 0.7, 2, primary, 0, 1.3, 0));
          figure.add(box(0.7, 0.5, 0.9, secondary, 0, 1.55, 1.15));
          figure.add(box(1.5, 0.08, 0.9, secondary, 1.2, 1.55, 0));
          figure.add(box(1.5, 0.08, 0.9, secondary, -1.2, 1.55, 0));
          figure.add(box(0.12, 0.12, 0.12, glow, 0.18, 1.7, 1.5));
          figure.add(box(0.12, 0.12, 0.12, glow, -0.18, 1.7, 1.5));
        } else if (current.silhouette === "blade") {
          figure.add(box(0.16, 1.3, 0.16, secondary, 0, 0.7, 0));
          figure.add(box(0.28, 1.5, 0.1, primary, 0, 2, 0));
          figure.add(box(0.08, 1.2, 0.04, glow, 0, 2.05, 0.06));
        } else if (current.silhouette === "block" || current.silhouette === "orb") {
          figure.add(box(1.2, 1.2, 1.2, primary, 0, 0.9, 0));
          figure.add(box(0.45, 0.2, 0.45, glow, 0, 1.55, 0));
        } else if (current.silhouette === "beast") {
          figure.add(box(1.4, 0.7, 0.8, primary, 0, 0.8, 0));
          figure.add(box(0.55, 0.5, 0.6, secondary, 0, 1.15, 0.55));
          figure.add(box(0.12, 0.1, 0.1, glow, 0.14, 1.25, 0.82));
          figure.add(box(0.12, 0.1, 0.1, glow, -0.14, 1.25, 0.82));
          figure.add(box(0.22, 0.5, 0.22, secondary, 0.45, 0.35, 0.25));
          figure.add(box(0.22, 0.5, 0.22, secondary, -0.45, 0.35, 0.25));
        } else {
          figure.add(box(0.9, 1.05, 0.55, primary, 0, 1.15, 0));
          figure.add(box(0.62, 0.55, 0.55, secondary, 0, 1.95, 0));
          const armL = box(0.28, 0.95, 0.28, primary, 0.68, 1.15, 0);
          const armR = box(0.28, 0.95, 0.28, primary, -0.68, 1.15, 0);
          armL.name = "armL";
          armR.name = "armR";
          figure.add(armL, armR);
          figure.add(box(0.28, 0.7, 0.28, secondary, 0.22, 0.4, 0));
          figure.add(box(0.28, 0.7, 0.28, secondary, -0.22, 0.4, 0));
          figure.add(box(0.1, 0.08, 0.06, glow, 0.14, 2.02, 0.28));
          figure.add(box(0.1, 0.08, 0.06, glow, -0.14, 2.02, 0.28));
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
        const armL = rig.getObjectByName("armL");
        const armR = rig.getObjectByName("armR");
        if (armL && armR && !reduced) {
          armL.rotation.x = Math.sin(t * 1.8) * 0.25;
          armR.rotation.x = -Math.sin(t * 1.8) * 0.25;
        }
        const distance = 7 / controls.current.zoom;
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
