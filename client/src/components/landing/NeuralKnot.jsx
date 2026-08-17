import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hero centerpiece — a GPU-driven "signal stream" wrapped around a torus knot.
 *
 * Everything that moves is computed in GLSL, so the CPU only uploads a handful
 * of uniforms per frame:
 *   • the torus-knot path is evaluated *in the vertex shader*, with the Frenet
 *     frame (tangent/normal/binormal) derived from finite differences, so up to
 *     16k particles flow along the curve for the cost of one draw call
 *   • 3D simplex noise adds curl-like turbulence per particle
 *   • cursor repulsion is applied in view space, so it tracks the pointer
 *     regardless of how the group is rotated
 *   • the knot tube itself uses a fresnel rim + traveling energy pulses driven
 *     by the geometry's own UVs
 *
 * Blending stays NORMAL rather than additive: the page is light, and additive
 * lavender on white washes out to white.
 */

const KNOT = { R: 10, tube: 3, p: 2, q: 3 };

// Shared GLSL: 3D simplex noise (Ashima / Gustavson), prefixed to avoid any
// collision with three.js' own chunk names.
const SIMPLEX_3D = /* glsl */ `
vec3 snMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 snMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 snPermute(vec4 x) { return snMod289(((x * 34.0) + 1.0) * x); }
vec4 snTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = snMod289(i);
  vec4 p = snPermute(snPermute(snPermute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = snTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uR;
uniform float uP;
uniform float uQ;
uniform vec2  uMouseView;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uNoiseAmp;
uniform float uNoiseFreq;

attribute float aProgress;
attribute float aSpeed;
attribute float aRadial;
attribute float aAngle;
attribute float aSize;
attribute float aColorMix;

varying float vColorMix;
varying float vFade;

${SIMPLEX_3D}

/** Parametric torus knot — the same path TorusKnotGeometry sweeps. */
vec3 knotPos(float t) {
  float r = uR + 0.5 * uR * cos(uQ * t);
  return vec3(r * cos(uP * t), r * sin(uP * t), 0.5 * uR * sin(uQ * t));
}

void main() {
  const float TAU = 6.28318530718;

  // Flow along the curve; fract() makes the loop seamless.
  float t = fract(aProgress + uTime * aSpeed * 0.018) * TAU;
  vec3 base = knotPos(t);

  // Frenet-ish frame from a central difference on the path
  float eps = 0.008;
  vec3 tangent = normalize(knotPos(t + eps) - knotPos(t - eps));
  vec3 up = vec3(0.0, 0.0, 1.0);
  vec3 normal = cross(tangent, up);
  // Guard the degenerate case where the tangent aligns with \`up\`
  normal = length(normal) < 1e-4 ? vec3(1.0, 0.0, 0.0) : normalize(normal);
  vec3 binormal = normalize(cross(tangent, normal));

  // Swirl around the tube, breathing slowly
  float ang = aAngle + uTime * 0.22;
  float radial = aRadial * (1.0 + 0.22 * sin(uTime * 1.1 + aAngle * 3.0));
  vec3 pos = base + (normal * cos(ang) + binormal * sin(ang)) * radial;

  // Curl-like turbulence: three decorrelated noise samples
  vec3 turb = vec3(
    snoise(pos * uNoiseFreq + vec3(0.0, 0.0, uTime * 0.14)),
    snoise(pos * uNoiseFreq + vec3(5.2, 1.3, uTime * 0.14)),
    snoise(pos * uNoiseFreq + vec3(9.1, 7.7, uTime * 0.14))
  );
  pos += turb * uNoiseAmp;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);

  // Cursor repulsion, applied in view space so it follows the pointer even
  // while the whole group is tilting.
  vec2 delta = mv.xy - uMouseView;
  float dist = length(delta);
  float falloff = exp(-(dist * dist) / (2.0 * uMouseRadius * uMouseRadius));
  mv.xy += normalize(delta + 1e-5) * uMouseStrength * falloff;

  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aSize * uPixelRatio * (34.0 / max(-mv.z, 0.001));

  vColorMix = aColorMix;
  // Particles further from the core read fainter, and depth softens them too
  vFade = (1.0 - smoothstep(0.0, 7.0, radial) * 0.55) *
          (0.45 + 0.55 * smoothstep(-70.0, -25.0, mv.z));
}
`;

const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uOpacity;

varying float vColorMix;
varying float vFade;

void main() {
  // Procedural soft disc — no texture upload needed
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.08, d);
  if (alpha < 0.01) discard;

  vec3 col = vColorMix < 0.5
    ? mix(uColorA, uColorB, vColorMix * 2.0)
    : mix(uColorB, uColorC, (vColorMix - 0.5) * 2.0);

  gl_FragColor = vec4(col, alpha * vFade * uOpacity);
}
`;

const TUBE_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const TUBE_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uPulseColor;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vViewDir;

void main() {
  // Fresnel rim: the silhouette glows, the facing surface stays quiet
  float fres = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.4);

  // Three energy pulses chasing each other along the knot's length
  float pulse = 0.0;
  for (int i = 0; i < 3; i++) {
    float phase = fract(vUv.x - uTime * (0.055 + 0.022 * float(i)) + float(i) * 0.34);
    pulse += exp(-phase * 26.0);
  }
  pulse = clamp(pulse, 0.0, 1.0);

  vec3 col = mix(uColor, uPulseColor, pulse);
  float alpha = uOpacity * (0.18 + 0.82 * fres) + pulse * 0.30;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

const NeuralKnot = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || 560;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    const CAM_Z = 46;
    camera.position.set(0, 0, CAM_Z);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = 0.5;
    scene.add(group);

    // ---- particle stream (all motion lives in the vertex shader) ----
    const count = width < 768 ? 6000 : 16000;
    const positions = new Float32Array(count * 3); // placeholder; shader owns real positions
    const aProgress = new Float32Array(count);
    const aSpeed = new Float32Array(count);
    const aRadial = new Float32Array(count);
    const aAngle = new Float32Array(count);
    const aSize = new Float32Array(count);
    const aColorMix = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      aProgress[i] = Math.random();
      aSpeed[i] = 0.45 + Math.random() * 1.5;
      // Biased inward so the core stays dense and the halo thins out
      aRadial[i] = Math.pow(Math.random(), 1.7) * 6.0;
      aAngle[i] = Math.random() * Math.PI * 2;
      aSize[i] = 0.5 + Math.random() * 1.1;
      aColorMix[i] = Math.random();
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("aProgress", new THREE.BufferAttribute(aProgress, 1));
    particleGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(aSpeed, 1));
    particleGeometry.setAttribute("aRadial", new THREE.BufferAttribute(aRadial, 1));
    particleGeometry.setAttribute("aAngle", new THREE.BufferAttribute(aAngle, 1));
    particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    particleGeometry.setAttribute("aColorMix", new THREE.BufferAttribute(aColorMix, 1));
    // Positions are generated on the GPU, so the automatic bounding sphere is
    // meaningless — set one by hand to keep frustum culling honest.
    particleGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), KNOT.R * 2.2);

    const particleMaterial = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uSize: { value: 2.6 },
        uR: { value: KNOT.R },
        uP: { value: KNOT.p },
        uQ: { value: KNOT.q },
        uMouseView: { value: new THREE.Vector2(9999, 9999) },
        uMouseStrength: { value: 3.4 },
        uMouseRadius: { value: 6.5 },
        uNoiseAmp: { value: 1.15 },
        uNoiseFreq: { value: 0.075 },
        uColorA: { value: new THREE.Color(0xbcb0da) },
        uColorB: { value: new THREE.Color(0x8f7ab8) },
        uColorC: { value: new THREE.Color(0x4b3d66) },
        uOpacity: { value: 0.9 },
      },
    });

    const points = new THREE.Points(particleGeometry, particleMaterial);
    group.add(points);

    // ---- knot tube: fresnel rim + traveling pulses ----
    const tubeGeometry = new THREE.TorusKnotGeometry(KNOT.R, KNOT.tube, 320, 24, KNOT.p, KNOT.q);
    const tubeMaterial = new THREE.ShaderMaterial({
      vertexShader: TUBE_VERT,
      fragmentShader: TUBE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xbcb0da) },
        uPulseColor: { value: new THREE.Color(0x614f83) },
        uOpacity: { value: 0.4 },
      },
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(tube);

    // ---- pointer: parallax tilt + view-space repulsion target ----
    const targetTilt = { x: 0.5, y: 0 };
    const mouseView = new THREE.Vector2(9999, 9999);
    const halfViewHeight = Math.tan((camera.fov * Math.PI) / 360) * CAM_Z;

    const handlePointerMove = (event) => {
      const ndcX = (event.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -((event.clientY / window.innerHeight) * 2 - 1);
      targetTilt.y = ndcX * 0.42;
      targetTilt.x = 0.5 - ndcY * 0.26;
      // View-space position of the cursor ray at the knot's depth
      mouseView.set(ndcX * halfViewHeight * camera.aspect, ndcY * halfViewHeight);
    };
    const handlePointerLeave = () => mouseView.set(9999, 9999);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

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

    const cleanup = () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      particleGeometry.dispose();
      particleMaterial.dispose();
      tubeGeometry.dispose();
      tubeMaterial.dispose();
      renderer.dispose();
    };

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
      return cleanup;
    }

    const timer = new THREE.Timer();
    let frameId;
    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();

      particleMaterial.uniforms.uTime.value = elapsed;
      particleMaterial.uniforms.uMouseView.value.copy(mouseView);
      tubeMaterial.uniforms.uTime.value = elapsed;

      group.rotation.z = elapsed * 0.07;
      group.rotation.x += (targetTilt.x - group.rotation.x) * 0.035;
      group.rotation.y += (targetTilt.y - group.rotation.y) * 0.035;

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

export default NeuralKnot;