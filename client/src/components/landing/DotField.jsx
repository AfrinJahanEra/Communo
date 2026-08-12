import { useEffect, useRef } from "react";
import * as THREE from "three";

const PALETTE = [0x8f7ab8, 0xa795cc, 0x6c8cd5, 0xe0a458, 0xd66b7c, 0x5fb8a8];

const REPEL_RADIUS = 95;
const REPEL_STRENGTH = 2.6;
const SPRING_K = 0.02;
const DAMPING = 0.85;
const CONNECT_DIST = 55;
const PICK_RADIUS = 16;
const CLICK_THRESHOLD = 6;
const MAX_SEGMENTS = 1400;
const SELECT_COLOR = 0x352b49;

// Light, interactive "confetti" dot field inspired by antigravity.google's hero
// graphic: dots drift with the cursor, spring back home, and draw constellation
// lines to nearby neighbors. Any dot can be dragged, and clicking one dot then
// another draws (or removes) a permanent connection between them.
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

    const dotGeometry = new THREE.CircleGeometry(1, 16);
    const materials = PALETTE.map(
      (color) => new THREE.MeshBasicMaterial({ color })
    );

    let dots = [];
    let manualConnections = [];
    let selectedDot = null;

    const ringGeometry = new THREE.RingGeometry(1, 1.35, 20);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: SELECT_COLOR,
      transparent: true,
      opacity: 0.85,
    });
    const selectRing = new THREE.Mesh(ringGeometry, ringMaterial);
    selectRing.visible = false;
    scene.add(selectRing);

    const clearSelection = () => {
      selectedDot = null;
      selectRing.visible = false;
    };

    const buildDots = () => {
      dots.forEach((d) => scene.remove(d.mesh));
      dots = [];
      manualConnections = [];
      clearSelection();

      // Keep-out box around the hero copy so dots frame the text instead of
      // sitting on top of it.
      const exclude = {
        halfW: Math.min(width * 0.32, 420),
        halfH: Math.min(height * 0.28, 260),
        y: -height * 0.04,
      };
      const inExclude = (x, y) =>
        Math.abs(x) < exclude.halfW && Math.abs(y - exclude.y) < exclude.halfH;

      const haloCount = Math.round((width * height) / 14000);
      const scatterCount = Math.round((width * height) / 22000);
      const maxOuter = Math.min(width, height) * 0.62;

      for (let i = 0; i < haloCount; i++) {
        let x, y;
        let attempts = 0;
        do {
          const t = Math.sqrt(Math.random());
          const radius = t * maxOuter;
          const angle = Math.random() * Math.PI * 2;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius * 0.75 - height * 0.05;
          attempts++;
        } while (inExclude(x, y) && attempts < 8);
        if (inExclude(x, y)) continue;
        dots.push(makeDot(x, y));
      }
      for (let i = 0; i < scatterCount; i++) {
        const x = (Math.random() - 0.5) * width;
        const y = (Math.random() - 0.5) * height;
        if (inExclude(x, y)) continue;
        dots.push(makeDot(x, y));
      }
    };

    const makeDot = (x, y) => {
      const radius = 2.5 + Math.random() * 3;
      const material = materials[Math.floor(Math.random() * materials.length)];
      const mesh = new THREE.Mesh(dotGeometry, material);
      mesh.position.set(x, y, 0);
      mesh.scale.set(radius, radius, 1);
      scene.add(mesh);
      return {
        mesh,
        radius,
        home: { x, y },
        pos: { x, y },
        vel: { x: 0, y: 0 },
        dragging: false,
      };
    };

    buildDots();

    // Constellation lines between nearby dots
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(MAX_SEGMENTS * 2 * 3);
    const lineColors = new Float32Array(MAX_SEGMENTS * 2 * 3);
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);
    const tmpColor = new THREE.Color();

    const mouseWorld = { x: 0, y: 1e6 };
    let hasPointer = false;
    let draggedDot = null;
    let pointerDownInfo = null;

    const toWorld = (clientX, clientY) => ({
      x: clientX - width / 2,
      y: height / 2 - clientY,
    });

    const findNearestDot = (w) => {
      let closest = null;
      let closestDist = PICK_RADIUS;
      for (const dot of dots) {
        const dx = dot.pos.x - w.x;
        const dy = dot.pos.y - w.y;
        const dist = Math.hypot(dx, dy);
        if (dist < closestDist + dot.radius) {
          closest = dot;
          closestDist = dist;
        }
      }
      return closest;
    };

    const toggleConnection = (a, b) => {
      const idx = manualConnections.findIndex(
        ([x, y]) => (x === a && y === b) || (x === b && y === a)
      );
      if (idx >= 0) {
        manualConnections.splice(idx, 1);
      } else {
        manualConnections.push([a, b]);
      }
    };

    const handlePointerMove = (event) => {
      const w = toWorld(event.clientX, event.clientY);
      mouseWorld.x = w.x;
      mouseWorld.y = w.y;
      hasPointer = true;
      if (draggedDot) {
        draggedDot.pos.x += (w.x - draggedDot.pos.x) * 0.35;
        draggedDot.pos.y += (w.y - draggedDot.pos.y) * 0.35;
      }
    };

    const handlePointerDown = (event) => {
      const w = toWorld(event.clientX, event.clientY);
      const closest = findNearestDot(w);
      pointerDownInfo = {
        dot: closest,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (closest) {
        closest.dragging = true;
        draggedDot = closest;
        mount.style.cursor = "grabbing";
      }
    };

    const handlePointerUp = (event) => {
      const info = pointerDownInfo;
      pointerDownInfo = null;

      if (draggedDot) {
        const moved = info
          ? Math.hypot(
              event.clientX - info.clientX,
              event.clientY - info.clientY
            )
          : Infinity;
        const clickedDot = draggedDot;

        clickedDot.dragging = false;
        clickedDot.vel.x = 0;
        clickedDot.vel.y = 0;
        draggedDot = null;
        mount.style.cursor = "";

        if (moved < CLICK_THRESHOLD) {
          // A tap/click on a dot: select it, or connect it to a
          // previously-selected dot.
          if (!selectedDot) {
            selectedDot = clickedDot;
            selectRing.visible = true;
          } else if (selectedDot === clickedDot) {
            clearSelection();
          } else {
            toggleConnection(selectedDot, clickedDot);
            clearSelection();
          }
        } else {
          // A real drag: the dot settles wherever it was dropped.
          clickedDot.home.x = clickedDot.pos.x;
          clickedDot.home.y = clickedDot.pos.y;
        }
      } else {
        clearSelection();
      }
    };

    const handlePointerLeave = () => {
      hasPointer = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    mount.addEventListener("pointerdown", handlePointerDown);
    mount.addEventListener("pointerleave", handlePointerLeave);

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

    let frameId;
    const animate = () => {
      for (const dot of dots) {
        if (dot.dragging) {
          dot.mesh.position.set(dot.pos.x, dot.pos.y, 0);
          continue;
        }

        if (hasPointer && !prefersReducedMotion) {
          const dx = dot.pos.x - mouseWorld.x;
          const dy = dot.pos.y - mouseWorld.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist < REPEL_RADIUS) {
            const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
            dot.vel.x += (dx / dist) * force;
            dot.vel.y += (dy / dist) * force;
          }
        }

        dot.vel.x += (dot.home.x - dot.pos.x) * SPRING_K;
        dot.vel.y += (dot.home.y - dot.pos.y) * SPRING_K;
        dot.vel.x *= DAMPING;
        dot.vel.y *= DAMPING;
        dot.pos.x += dot.vel.x;
        dot.pos.y += dot.vel.y;
        dot.mesh.position.set(dot.pos.x, dot.pos.y, 0);
      }

      // Rebuild constellation segments among nearby dots
      let segmentCount = 0;
      for (let i = 0; i < dots.length && segmentCount < MAX_SEGMENTS; i++) {
        for (let j = i + 1; j < dots.length && segmentCount < MAX_SEGMENTS; j++) {
          const a = dots[i];
          const b = dots[j];
          const dx = a.pos.x - b.pos.x;
          const dy = a.pos.y - b.pos.y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONNECT_DIST) {
            const base = segmentCount * 6;
            linePositions[base] = a.pos.x;
            linePositions[base + 1] = a.pos.y;
            linePositions[base + 2] = 0;
            linePositions[base + 3] = b.pos.x;
            linePositions[base + 4] = b.pos.y;
            linePositions[base + 5] = 0;

            const opacity = 1 - dist / CONNECT_DIST;
            tmpColor.set(0x8f7ab8);
            const colorBase = segmentCount * 6;
            lineColors[colorBase] = tmpColor.r * opacity;
            lineColors[colorBase + 1] = tmpColor.g * opacity;
            lineColors[colorBase + 2] = tmpColor.b * opacity;
            lineColors[colorBase + 3] = tmpColor.r * opacity;
            lineColors[colorBase + 4] = tmpColor.g * opacity;
            lineColors[colorBase + 5] = tmpColor.b * opacity;
            segmentCount++;
          }
        }
      }
      // Persistent user-made connections draw on top, fully opaque.
      for (const [a, b] of manualConnections) {
        if (segmentCount >= MAX_SEGMENTS) break;
        const base = segmentCount * 6;
        linePositions[base] = a.pos.x;
        linePositions[base + 1] = a.pos.y;
        linePositions[base + 2] = 0;
        linePositions[base + 3] = b.pos.x;
        linePositions[base + 4] = b.pos.y;
        linePositions[base + 5] = 0;

        tmpColor.set(SELECT_COLOR);
        const colorBase = segmentCount * 6;
        lineColors[colorBase] = tmpColor.r;
        lineColors[colorBase + 1] = tmpColor.g;
        lineColors[colorBase + 2] = tmpColor.b;
        lineColors[colorBase + 3] = tmpColor.r;
        lineColors[colorBase + 4] = tmpColor.g;
        lineColors[colorBase + 5] = tmpColor.b;
        segmentCount++;
      }

      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      lineGeometry.setDrawRange(0, segmentCount * 2);

      if (selectedDot) {
        selectRing.position.set(selectedDot.pos.x, selectedDot.pos.y, 0);
        const s = selectedDot.radius * 2.2;
        selectRing.scale.set(s, s, 1);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("pointerdown", handlePointerDown);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      mount.removeChild(renderer.domElement);
      dotGeometry.dispose();
      materials.forEach((m) => m.dispose());
      lineGeometry.dispose();
      lineMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10"
      style={{ cursor: "default" }}
    />
  );
};

export default DotField;
