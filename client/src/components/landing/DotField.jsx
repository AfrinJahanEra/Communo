import { useEffect, useRef } from "react";
import * as THREE from "three";

// A smooth 3-stop wash across the app's own lavender scale (light -> mid -> deep)
// instead of a multi-hue "confetti" palette.
const COLOR_STOPS = [0xbcb0da, 0x8f7ab8, 0x614f83];
const HIGHLIGHT_COLOR = 0x352b49;

const TARGET_DOT_COUNT = 140;
const DOT_TEXTURE_SIZE = 64;

// Cursor-repel physics: dots push away from wherever the pointer is, then
// spring back to their grid position once it moves on.
const REPEL_RADIUS = 90;
const REPEL_STRENGTH = 2.4;
const SPRING_K = 0.02;
const DAMPING = 0.85;

/** Cheap deterministic hash -> [0, 1), the seed for value noise below. */
const hash2 = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

/** Smooth 2D value noise (bilinear-interpolated hash grid) -> [0, 1). */
const noise2D = (x, y) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Soft rounded-square sprite, reused across every dot. */
const makeDotTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = DOT_TEXTURE_SIZE;
  canvas.height = DOT_TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  const pad = 4;
  const r = DOT_TEXTURE_SIZE * 0.3;
  const size = DOT_TEXTURE_SIZE - pad * 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(pad, pad, size, size, r);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
};

const colorAt = (stops, x, y) => {
  const n = noise2D(x * 0.0022 + 12.3, y * 0.0022 - 7.1);
  return n < 0.5
    ? stops[0].clone().lerp(stops[1], n / 0.5)
    : stops[1].clone().lerp(stops[2], (n - 0.5) / 0.5);
};

/**
 * Ambient dot field inspired by antigravity.google's hero background, kept
 * sparse and simple: a light, evenly-spaced scatter of rounded-square points
 * in a lavender color wash, faded out behind the hero copy so it never sits
 * on top of the text. Dots physically push away from wherever the cursor is
 * and spring back once it moves on. A slow pulse ring also drifts through on
 * its own (easing toward the cursor on hover) and gently grows nearby dots.
 * Press a dot and drag to another to connect them (a live preview line
 * follows the pointer); drag between two already-connected dots again to
 * remove that link.
 */
const DotField = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();
    let width = window.innerWidth;
    let height = window.innerHeight;

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      10
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const dotTexture = makeDotTexture();
    const colorStops = COLOR_STOPS.map((c) => new THREE.Color(c));
    const highlightColor = new THREE.Color(HIGHLIGHT_COLOR);

    let dots = [];
    let dragDot = null; // dot the current press-drag started from, if any
    let connections = []; // [dotA, dotB][]
    let connectionLines = null;

    const previewGeometry = new THREE.BufferGeometry();
    previewGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const previewMaterial = new THREE.LineBasicMaterial({
      color: highlightColor,
      transparent: true,
      opacity: 0.6,
    });
    const previewLine = new THREE.Line(previewGeometry, previewMaterial);
    previewLine.visible = false;
    scene.add(previewLine);

    const rebuildConnectionLines = () => {
      if (connectionLines) {
        scene.remove(connectionLines);
        connectionLines.geometry.dispose();
        connectionLines.material.dispose();
        connectionLines = null;
      }
      if (!connections.length) return;
      const positions = new Float32Array(connections.length * 2 * 3);
      connections.forEach(([a, b], i) => {
        const base = i * 6;
        positions[base] = a.pos.x;
        positions[base + 1] = a.pos.y;
        positions[base + 2] = 0.1;
        positions[base + 3] = b.pos.x;
        positions[base + 4] = b.pos.y;
        positions[base + 5] = 0.1;
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: highlightColor,
        transparent: true,
        opacity: 0.5,
      });
      connectionLines = new THREE.LineSegments(geometry, material);
      scene.add(connectionLines);
    };

    // Dots keep moving (repel/spring) after a connection is made, so the
    // line's endpoints need to track their current position every frame.
    const updateConnectionLinePositions = () => {
      if (!connectionLines) return;
      const positions = connectionLines.geometry.attributes.position.array;
      connections.forEach(([a, b], i) => {
        const base = i * 6;
        positions[base] = a.pos.x;
        positions[base + 1] = a.pos.y;
        positions[base + 3] = b.pos.x;
        positions[base + 4] = b.pos.y;
      });
      connectionLines.geometry.attributes.position.needsUpdate = true;
    };

    const toggleConnection = (a, b) => {
      const idx = connections.findIndex(
        ([x, y]) => (x === a && y === b) || (x === b && y === a)
      );
      if (idx >= 0) connections.splice(idx, 1);
      else connections.push([a, b]);
      rebuildConnectionLines();
    };

    const buildDots = () => {
      dots.forEach((d) => {
        scene.remove(d.sprite);
        d.material.dispose();
      });
      dots = [];
      connections = [];
      dragDot = null;
      rebuildConnectionLines();

      // Soft keep-clear zone behind the hero heading/subtext: dots fade out
      // toward its center instead of a hard cutoff, so the copy stays readable.
      const textHalfW = Math.min(width * 0.32, 440);
      const textHalfH = Math.min(height * 0.24, 230);
      const textY = -height * 0.05;
      const fadeAt = (x, y) => {
        const nx = Math.abs(x) / textHalfW;
        const ny = Math.abs(y - textY) / textHalfH;
        return smoothstep(0.5, 1.1, Math.max(nx, ny));
      };

      // Jittered grid: an even, sparse spread that still reads as organic
      // (a cheap stand-in for the blue-noise/Poisson-disc fill the reference uses).
      const cellSize = Math.sqrt((width * height) / TARGET_DOT_COUNT);
      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;
      const jitter = cellSize * 0.42;

      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const baseX = -width / 2 + cx * cellSize + cellSize / 2;
          const baseY = -height / 2 + cy * cellSize + cellSize / 2;
          const x = baseX + (noise2D(cx * 3.1, cy * 7.7) - 0.5) * 2 * jitter;
          const y = baseY + (noise2D(cx * 7.7 + 40, cy * 3.1 + 40) - 0.5) * 2 * jitter;

          const baseRadius = 2.1 + Math.random() * 1.1;
          const material = new THREE.SpriteMaterial({
            map: dotTexture,
            color: colorAt(colorStops, x, y),
            transparent: true,
            opacity: fadeAt(x, y),
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(material);
          sprite.position.set(x, y, 0);
          scene.add(sprite);

          dots.push({
            sprite,
            material,
            baseRadius,
            home: { x, y },
            pos: { x, y },
            vel: { x: 0, y: 0 },
            scale: 0.35,
            baseColor: material.color.clone(),
          });
        }
      }
    };

    buildDots();

    const mouseWorld = { x: 0, y: 0 };
    let hasPointer = false;
    const toWorld = (clientX, clientY) => ({
      x: clientX - width / 2,
      y: height / 2 - clientY,
    });
    const handlePointerMove = (event) => {
      const w = toWorld(event.clientX, event.clientY);
      mouseWorld.x = w.x;
      mouseWorld.y = w.y;
      hasPointer = true;
    };
    const handlePointerLeave = () => {
      hasPointer = false;
    };
    window.addEventListener("pointermove", handlePointerMove);
    mount.addEventListener("pointerleave", handlePointerLeave);

    // ---- press a dot, drag, release on another to connect them ----
    // Rendered dots are only a few px across, so pick by proximity in world
    // space (which maps 1:1 to CSS px here) rather than exact hit-testing —
    // far more forgiving for an actual pointing device.
    const PICK_RADIUS = 16;
    const findNearestDot = (worldX, worldY) => {
      let closest = null;
      let closestDist = PICK_RADIUS;
      for (const dot of dots) {
        const dist = Math.hypot(dot.pos.x - worldX, dot.pos.y - worldY);
        if (dist < closestDist) {
          closest = dot;
          closestDist = dist;
        }
      }
      return closest;
    };
    const handlePointerDown = (event) => {
      const w = toWorld(event.clientX, event.clientY);
      const dot = findNearestDot(w.x, w.y);
      if (dot) dragDot = dot;
    };
    const handlePointerUp = (event) => {
      if (!dragDot) return;
      const w = toWorld(event.clientX, event.clientY);
      const target = findNearestDot(w.x, w.y);
      if (target && target !== dragDot) toggleConnection(dragDot, target);
      dragDot = null;
    };
    mount.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        width = window.innerWidth;
        height = window.innerHeight;
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        buildDots();
      }, 150);
    };
    window.addEventListener("resize", handleResize);

    const sizeFor = (dot) => dot.baseRadius * 2 * (0.75 + dot.scale * 0.6);

    const applyRestingScale = () => {
      for (const dot of dots) {
        dot.sprite.scale.set(sizeFor(dot), sizeFor(dot), 1);
      }
    };

    const cleanup = () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerup", handlePointerUp);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      mount.removeEventListener("pointerdown", handlePointerDown);
      mount.removeChild(renderer.domElement);
      dots.forEach((d) => d.material.dispose());
      if (connectionLines) {
        connectionLines.geometry.dispose();
        connectionLines.material.dispose();
      }
      previewGeometry.dispose();
      previewMaterial.dispose();
      dotTexture.dispose();
      renderer.dispose();
    };

    if (prefersReducedMotion) {
      applyRestingScale();
      renderer.render(scene, camera);
      return cleanup;
    }

    const timer = new THREE.Timer();
    const ring = { x: 0, y: 0 };
    const minSpan = Math.min(width, height);
    const ringRadiusBase = minSpan * 0.22;
    const ringBand = minSpan * 0.08;

    let frameId;
    const animate = () => {
      timer.update();
      const t = timer.getElapsed();

      // Ambient drift so the ring is always alive, even before the visitor
      // moves the mouse — then eases toward the cursor while hovering.
      const driftX = (noise2D(t * 0.12, 5.2) - 0.5) * 2 * width * 0.12;
      const driftY = (noise2D(t * 0.12, 91.4) - 0.5) * 2 * height * 0.12;
      const targetX = hasPointer ? mouseWorld.x * 0.5 + driftX * 0.3 : driftX;
      const targetY = hasPointer ? mouseWorld.y * 0.5 + driftY * 0.3 : driftY;
      const ease = hasPointer ? 0.05 : 0.02;
      ring.x += (targetX - ring.x) * ease;
      ring.y += (targetY - ring.y) * ease;

      const ringRadius =
        ringRadiusBase + Math.sin(t * 0.9) * ringRadiusBase * 0.12 + Math.cos(t * 1.7) * ringRadiusBase * 0.08;

      // While dragging, highlight the origin dot plus whatever dot is
      // currently under the pointer — the pair that would connect on release.
      const hoverTarget = dragDot ? findNearestDot(mouseWorld.x, mouseWorld.y) : null;

      for (const dot of dots) {
        // Repel from the cursor, then spring back home — this is what
        // actually moves the dot, wherever the pointer currently is.
        if (hasPointer) {
          const rdx = dot.pos.x - mouseWorld.x;
          const rdy = dot.pos.y - mouseWorld.y;
          const rdist = Math.hypot(rdx, rdy) || 0.001;
          if (rdist < REPEL_RADIUS) {
            const force = (1 - rdist / REPEL_RADIUS) * REPEL_STRENGTH;
            dot.vel.x += (rdx / rdist) * force;
            dot.vel.y += (rdy / rdist) * force;
          }
        }
        dot.vel.x += (dot.home.x - dot.pos.x) * SPRING_K;
        dot.vel.y += (dot.home.y - dot.pos.y) * SPRING_K;
        dot.vel.x *= DAMPING;
        dot.vel.y *= DAMPING;
        dot.pos.x += dot.vel.x;
        dot.pos.y += dot.vel.y;
        dot.sprite.position.set(dot.pos.x, dot.pos.y, 0);

        // Ambient ring pulse stays anchored to the dot's grid position, not
        // its momentarily cursor-displaced one.
        const dx = dot.home.x - ring.x;
        const dy = dot.home.y - ring.y;
        const dist = Math.hypot(dx, dy);
        const band =
          smoothstep(ringRadius - ringBand * 2, ringRadius, dist) -
          smoothstep(ringRadius, ringRadius + ringBand, dist);
        const isHighlighted = dot === dragDot || dot === hoverTarget;
        const target = isHighlighted ? 1 : Math.min(1, Math.max(0.16, band * 1.15 + 0.16));
        // Drag feedback should feel instant; the ambient ring pulse stays slow.
        dot.scale += (target - dot.scale) * (isHighlighted ? 0.5 : 0.12);
        const s = sizeFor(dot);
        dot.sprite.scale.set(s, s, 1);
        dot.material.color.lerp(isHighlighted ? highlightColor : dot.baseColor, isHighlighted ? 0.5 : 0.15);
      }

      updateConnectionLinePositions();

      if (dragDot) {
        const pos = previewLine.geometry.attributes.position;
        pos.array[0] = dragDot.pos.x;
        pos.array[1] = dragDot.pos.y;
        pos.array[2] = 0.1;
        pos.array[3] = mouseWorld.x;
        pos.array[4] = mouseWorld.y;
        pos.array[5] = 0.1;
        pos.needsUpdate = true;
        previewLine.visible = true;
      } else {
        previewLine.visible = false;
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      cleanup();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="pointer-events-auto fixed inset-0"
      style={{ cursor: "default" }}
    />
  );
};

export default DotField;
