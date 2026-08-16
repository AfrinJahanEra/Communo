import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Three.js hero centerpiece: a torus-knot "signal stream".
 * ~1200 glowing particles flow continuously along a TorusKnot curve
 * (positions resolved through a precomputed Frenet-frame lookup table,
 * so per-frame cost is just an array walk), wrapped in a faint
 * counter-rotating wireframe knot. The whole group tilts toward the
 * cursor with soft parallax. Additive blending keeps it luminous but
 * light enough to sit behind the hero copy.
 */

const PARTICLE_COUNT = 1200;
const LUT_SIZE = 2048; // dense curve lookup table
const KNOT_ARGS = [10, 3, 2, 3]; // radius, tube, p, q
const SPRAY_RADIUS = 3.2; // jitter around the curve, in world units

const COLOR_STOPS = [0xd4cbe8, 0x8f7ab8, 0x614f83];

/** Soft round glow sprite shared by every particle. */
const makeGlowTexture = () => {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

const KnotOrbit = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || 560;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    camera.position.set(0, 0, 46);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = 0.5;
    scene.add(group);

    // ---- curve lookup table: points + normal/binormal frames ----
    // Parametric torus-knot curve (the same path TorusKnotGeometry sweeps),
    // sampled into a LUT so the per-frame cost is a plain array walk.
    const p = KNOT_ARGS[2];
    const q = KNOT_ARGS[3];
    const R = KNOT_ARGS[0];
    const knotPath = (t) => {
      const cu = Math.cos(q * t);
      const r = R + 0.5 * R * cu;
      return new THREE.Vector3(
        r * Math.cos(p * t),
        r * Math.sin(p * t),
        0.5 * R * Math.sin(q * t)
      );
    };

    const lutPoints = [];
    const lutNormals = [];
    const lutBinormals = [];
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < LUT_SIZE; i++) {
      const t = (i / LUT_SIZE) * Math.PI * 2;
      const pos = knotPath(t);
      const tangent = knotPath(t + 0.001).sub(knotPath(t - 0.001)).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up);
      if (normal.lengthSq() < 1e-6) normal.set(1, 0, 0);
      normal.normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      lutPoints.push(pos);
      lutNormals.push(normal);
      lutBinormals.push(binormal);
    }

    // ---- flowing particle stream ----
    const glowTexture = makeGlowTexture();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const stops = COLOR_STOPS.map((c) => new THREE.Color(c));

    const particles = [];
    const color = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        offset: Math.random() * LUT_SIZE,
        speed: 0.5 + Math.random() * 1.4,
        radial: Math.pow(Math.random(), 1.6) * SPRAY_RADIUS,
        angle: Math.random() * Math.PI * 2,
        sizeJitter: 0.6 + Math.random() * 0.8,
      });
      color.copy(stops[0]).lerp(stops[2], Math.random());
      colors.set([color.r, color.g, color.b], i * 3);
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.34,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    group.add(points);

    // ---- faint wireframe knot, counter-rotating ----
    const wireGeometry = new THREE.TorusKnotGeometry(...KNOT_ARGS, 160, 10);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4cbe8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    group.add(wire);

    // ---- pointer parallax ----
    const targetTilt = { x: 0.5, y: 0 };
    const handlePointerMove = (event) => {
      targetTilt.y = (event.clientX / window.innerWidth - 0.5) * 0.7;
      targetTilt.x = 0.5 + (event.clientY / window.innerHeight - 0.5) * 0.5;
    };
    window.addEventListener("pointermove", handlePointerMove);

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        width = mount.clientWidth || window.innerWidth;
        height = mount.clientHeight || 560;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }, 150);
    };
    window.addEventListener("resize", handleResize);

    const updateParticles = (elapsed) => {
      const posAttr = pointsGeometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pt = particles[i];
        const idx = Math.floor((pt.offset + elapsed * pt.speed * 22) % LUT_SIZE);
        const base = lutPoints[idx];
        const normal = lutNormals[idx];
        const binormal = lutBinormals[idx];
        const wobble = Math.sin(elapsed * 1.3 + pt.angle * 4) * 0.35;
        const radial = pt.radial + wobble;
        arr[i * 3] =
          base.x + normal.x * Math.cos(pt.angle) * radial + binormal.x * Math.sin(pt.angle) * radial;
        arr[i * 3 + 1] =
          base.y + normal.y * Math.cos(pt.angle) * radial + binormal.y * Math.sin(pt.angle) * radial;
        arr[i * 3 + 2] =
          base.z + normal.z * Math.cos(pt.angle) * radial + binormal.z * Math.sin(pt.angle) * radial;
      }
      posAttr.needsUpdate = true;
    };

    const cleanup = () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
      glowTexture.dispose();
      renderer.dispose();
    };

    if (prefersReducedMotion) {
      updateParticles(0);
      renderer.render(scene, camera);
      return cleanup;
    }

    // THREE.Timer replaces the deprecated THREE.Clock
    const timer = new THREE.Timer();
    let frameId;
    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();

      updateParticles(elapsed);

      group.rotation.z = elapsed * 0.08;
      wire.rotation.z = -elapsed * 0.14;
      group.rotation.x += (targetTilt.x - group.rotation.x) * 0.04;
      group.rotation.y += (targetTilt.y - group.rotation.y) * 0.04;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      cleanup();
    };
  }, []);

  return <div ref={mountRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
};

export default KnotOrbit;
