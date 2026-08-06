import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =====================================================================
// <ParticleOrb /> — ADN Digital 3D con Three.js
//
// Doble hélice neón volumétrica inspirada en referencia visual:
//   - 2 cadenas gruesas (tube) con glow intenso (cyan + naranja/coral)
//   - Puentes horizontales tipo data-link entre cadenas
//   - Red sutil de partículas dispersas (fondo limpio, no sobrecargado)
//   - Base hexagonal luminosa con circuitos radiando
//   - Bloom/glow pronunciado via additive blending
//   - Audio-reactivo: vibra con voz del Oráculo o micrófono
// =====================================================================

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  colorA?: [number, number, number]; // strand A (RGB 0-255) — CYAN
  colorB?: [number, number, number]; // strand B (RGB 0-255) — ORANGE/CORAL
  className?: string;
}

export default function ParticleOrb({
  audioStream = null,
  enableMic = false,
  colorA = [92, 200, 255],   // Cyan neón
  colorB = [255, 107, 53],   // Naranja/coral neón
  className,
}: ParticleOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);


  // ── Three.js scene + animation ─────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Colors normalized 0-1
    const cA = new THREE.Color(colorA[0] / 255, colorA[1] / 255, colorA[2] / 255);
    const cB = new THREE.Color(colorB[0] / 255, colorB[1] / 255, colorB[2] / 255);

    // ── Scene, Camera, Renderer ────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // ── Configuration ──────────────────────────────────────────────
    const HELIX_TURNS = 4.5;
    const HELIX_HEIGHT = 5.5;
    const HELIX_RADIUS = 0.85;
    const TUBE_RADIUS = 0.06;
    const TUBE_SEGMENTS = 200;
    const BRIDGE_COUNT = 28;
    const BRIDGE_DOTS = 8;
    const NET_PARTICLES = 80; // Pocas — fondo limpio
    const STRAND_PARTICLES = 300; // Puntos de glow sobre las cadenas


    // ── Main Group ─────────────────────────────────────────────────
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    // ── Glow point texture (soft circle) ──────────────────────────
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d')!;
    const grad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    // ── Helper: generate helix curve points ───────────────────────
    const generateHelixPoints = (offset: number, segments: number): THREE.Vector3[] => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2 * HELIX_TURNS + offset;
        const y = (t - 0.5) * HELIX_HEIGHT;
        pts.push(new THREE.Vector3(
          Math.cos(angle) * HELIX_RADIUS,
          y,
          Math.sin(angle) * HELIX_RADIUS,
        ));
      }
      return pts;
    };


    // ── Strand A — Tube (cyan) ────────────────────────────────────
    const curveA = new THREE.CatmullRomCurve3(generateHelixPoints(0, TUBE_SEGMENTS), false);
    const tubeGeomA = new THREE.TubeGeometry(curveA as any, TUBE_SEGMENTS, TUBE_RADIUS, 8, false);
    const tubeMatA = new THREE.MeshBasicMaterial({
      color: cA,
      transparent: true,
      opacity: 0.85,
    });
    const tubeA = new THREE.Mesh(tubeGeomA, tubeMatA);
    helixGroup.add(tubeA);

    // Outer glow tube A (larger, more transparent)
    const tubeGlowGeomA = new THREE.TubeGeometry(curveA as any, TUBE_SEGMENTS, TUBE_RADIUS * 3, 8, false);
    const tubeGlowMatA = new THREE.MeshBasicMaterial({
      color: cA,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tubeGlowA = new THREE.Mesh(tubeGlowGeomA, tubeGlowMatA);
    helixGroup.add(tubeGlowA);

    // ── Strand B — Tube (orange/coral) ────────────────────────────
    const curveB = new THREE.CatmullRomCurve3(generateHelixPoints(Math.PI, TUBE_SEGMENTS), false);
    const tubeGeomB = new THREE.TubeGeometry(curveB as any, TUBE_SEGMENTS, TUBE_RADIUS, 8, false);
    const tubeMatB = new THREE.MeshBasicMaterial({
      color: cB,
      transparent: true,
      opacity: 0.85,
    });
    const tubeB = new THREE.Mesh(tubeGeomB, tubeMatB);
    helixGroup.add(tubeB);

    // Outer glow tube B
    const tubeGlowGeomB = new THREE.TubeGeometry(curveB as any, TUBE_SEGMENTS, TUBE_RADIUS * 3, 8, false);
    const tubeGlowMatB = new THREE.MeshBasicMaterial({
      color: cB,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tubeGlowB = new THREE.Mesh(tubeGlowGeomB, tubeGlowMatB);
    helixGroup.add(tubeGlowB);


    // ── Strand glow particles (bright dots along helix) ───────────
    const strandParticlePositions = new Float32Array(STRAND_PARTICLES * 2 * 3);
    const strandParticleColors = new Float32Array(STRAND_PARTICLES * 2 * 3);
    for (let i = 0; i < STRAND_PARTICLES; i++) {
      const t = i / (STRAND_PARTICLES - 1);
      const angleA = t * Math.PI * 2 * HELIX_TURNS;
      const angleB = angleA + Math.PI;
      const y = (t - 0.5) * HELIX_HEIGHT;

      // Strand A particle
      const idxA = i * 3;
      strandParticlePositions[idxA] = Math.cos(angleA) * HELIX_RADIUS;
      strandParticlePositions[idxA + 1] = y;
      strandParticlePositions[idxA + 2] = Math.sin(angleA) * HELIX_RADIUS;
      strandParticleColors[idxA] = cA.r;
      strandParticleColors[idxA + 1] = cA.g;
      strandParticleColors[idxA + 2] = cA.b;

      // Strand B particle
      const idxB = (STRAND_PARTICLES + i) * 3;
      strandParticlePositions[idxB] = Math.cos(angleB) * HELIX_RADIUS;
      strandParticlePositions[idxB + 1] = y;
      strandParticlePositions[idxB + 2] = Math.sin(angleB) * HELIX_RADIUS;
      strandParticleColors[idxB] = cB.r;
      strandParticleColors[idxB + 1] = cB.g;
      strandParticleColors[idxB + 2] = cB.b;
    }

    const strandPGeom = new THREE.BufferGeometry();
    strandPGeom.setAttribute('position', new THREE.Float32BufferAttribute(strandParticlePositions, 3));
    strandPGeom.setAttribute('color', new THREE.Float32BufferAttribute(strandParticleColors, 3));
    const strandPMat = new THREE.PointsMaterial({
      size: 0.07,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (strandPMat as any).map = glowTexture;
    const strandPoints = new THREE.Points(strandPGeom, strandPMat);
    helixGroup.add(strandPoints);


    // ── Bridges (data-links between strands) ──────────────────────
    const bridgePositions = new Float32Array(BRIDGE_COUNT * BRIDGE_DOTS * 3);
    const bridgeColors = new Float32Array(BRIDGE_COUNT * BRIDGE_DOTS * 3);
    const bridgeGeom = new THREE.BufferGeometry();
    bridgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(bridgePositions, 3));
    bridgeGeom.setAttribute('color', new THREE.Float32BufferAttribute(bridgeColors, 3));
    const bridgeMat = new THREE.PointsMaterial({
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (bridgeMat as any).map = glowTexture;
    const bridgePointsMesh = new THREE.Points(bridgeGeom, bridgeMat);
    helixGroup.add(bridgePointsMesh);

    // Bridge lines (thin neon connections)
    const bridgeLinePositions = new Float32Array(BRIDGE_COUNT * 2 * 3);
    const bridgeLineColors = new Float32Array(BRIDGE_COUNT * 2 * 3);
    const bridgeLineGeom = new THREE.BufferGeometry();
    bridgeLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(bridgeLinePositions, 3));
    bridgeLineGeom.setAttribute('color', new THREE.Float32BufferAttribute(bridgeLineColors, 3));
    const bridgeLineMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      linewidth: 1,
    });
    const bridgeLines = new THREE.LineSegments(bridgeLineGeom, bridgeLineMat);
    helixGroup.add(bridgeLines);


    // ── Background network particles (sparse — clean background) ──
    const netPositions = new Float32Array(NET_PARTICLES * 3);
    const netColors = new Float32Array(NET_PARTICLES * 3);
    const netSpeeds: { vx: number; vy: number; vz: number; phase: number }[] = [];
    for (let i = 0; i < NET_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 2.0;
      netPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      netPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      netPositions[i * 3 + 2] = r * Math.cos(phi);
      // Mix cyan/orange with low saturation
      const mix = Math.random();
      netColors[i * 3] = cA.r * (1 - mix) + cB.r * mix;
      netColors[i * 3 + 1] = cA.g * (1 - mix) + cB.g * mix;
      netColors[i * 3 + 2] = cA.b * (1 - mix) + cB.b * mix;
      netSpeeds.push({
        vx: (Math.random() - 0.5) * 0.001,
        vy: (Math.random() - 0.5) * 0.001,
        vz: (Math.random() - 0.5) * 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const netGeom = new THREE.BufferGeometry();
    netGeom.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
    netGeom.setAttribute('color', new THREE.Float32BufferAttribute(netColors, 3));
    const netMat = new THREE.PointsMaterial({
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (netMat as any).map = glowTexture;
    const netPoints = new THREE.Points(netGeom, netMat);
    scene.add(netPoints);

    // Sparse connection lines between nearby network particles
    const connLinePositions = new Float32Array(60 * 2 * 3); // max 60 connections
    const connLineColors = new Float32Array(60 * 2 * 3);
    const connGeom = new THREE.BufferGeometry();
    connGeom.setAttribute('position', new THREE.Float32BufferAttribute(connLinePositions, 3));
    connGeom.setAttribute('color', new THREE.Float32BufferAttribute(connLineColors, 3));
    const connMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const connLines = new THREE.LineSegments(connGeom, connMat);
    scene.add(connLines);


    // ── Base hexagonal luminosa ───────────────────────────────────
    const baseGeom = new THREE.BufferGeometry();
    const baseVerts: number[] = [];
    const baseColors: number[] = [];
    const hexRadius = 1.2;
    const baseY = -HELIX_HEIGHT / 2 - 0.3;
    // Hexagon outline
    for (let i = 0; i < 6; i++) {
      const a1 = (i / 6) * Math.PI * 2;
      const a2 = ((i + 1) / 6) * Math.PI * 2;
      baseVerts.push(Math.cos(a1) * hexRadius, baseY, Math.sin(a1) * hexRadius);
      baseVerts.push(Math.cos(a2) * hexRadius, baseY, Math.sin(a2) * hexRadius);
      baseColors.push(cA.r * 0.6, cA.g * 0.6, cA.b * 0.6);
      baseColors.push(cB.r * 0.6, cB.g * 0.6, cB.b * 0.6);
    }
    // Radial circuit lines from center
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const innerR = 0.15;
      const outerR = hexRadius * 0.85;
      baseVerts.push(Math.cos(angle) * innerR, baseY, Math.sin(angle) * innerR);
      baseVerts.push(Math.cos(angle) * outerR, baseY, Math.sin(angle) * outerR);
      const mix = i / 12;
      baseColors.push(cA.r * (1 - mix) + cB.r * mix, cA.g * (1 - mix) + cB.g * mix, cA.b * (1 - mix) + cB.b * mix);
      baseColors.push(cA.r * mix + cB.r * (1 - mix), cA.g * mix + cB.g * (1 - mix), cA.b * mix + cB.b * (1 - mix));
    }
    baseGeom.setAttribute('position', new THREE.Float32BufferAttribute(baseVerts, 3));
    baseGeom.setAttribute('color', new THREE.Float32BufferAttribute(baseColors, 3));
    const baseMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const baseMesh = new THREE.LineSegments(baseGeom, baseMat);
    helixGroup.add(baseMesh);

    // Base glow sphere (subtle)
    const baseGlowGeom = new THREE.SphereGeometry(0.3, 16, 16);
    const baseGlowMat = new THREE.MeshBasicMaterial({
      color: cA,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const baseGlow = new THREE.Mesh(baseGlowGeom, baseGlowMat);
    baseGlow.position.set(0, baseY, 0);
    helixGroup.add(baseGlow);


    // ── Central glow (breath halo) ────────────────────────────────
    const haloGeom = new THREE.SphereGeometry(1.8, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor1: { value: cA },
        uColor2: { value: cB },
        uIntensity: { value: 0.06 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uIntensity;
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          rim = pow(rim, 3.5);
          vec3 color = mix(uColor1, uColor2, sin(uTime * 0.4) * 0.5 + 0.5);
          gl_FragColor = vec4(color, rim * uIntensity);
        }
      `,
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    scene.add(haloMesh);


    // ── Resize handler ────────────────────────────────────────────
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ── Animation state ───────────────────────────────────────────
    let freq: Uint8Array | null = null;
    const clock = new THREE.Clock();

    // ── Animation loop ────────────────────────────────────────────
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Audio level (0..1)
      let level = 0.08 + Math.sin(elapsed * 1.0) * 0.03; // subtle breath
      const analyser = analyserRef.current;
      if (analyser) {
        const bins = analyser.frequencyBinCount;
        if (!freq || freq.length !== bins) freq = new Uint8Array(bins);
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        level = Math.min(1, (sum / freq.length) / 52);
      }


      // ── Rebuild helix tubes each frame (scroll effect) ──────────
      const scrollOffset = elapsed * 0.6; // slow continuous scroll

      const ptsA = generateHelixPoints(scrollOffset, TUBE_SEGMENTS);
      const ptsB = generateHelixPoints(scrollOffset + Math.PI, TUBE_SEGMENTS);

      // Update tube geometries
      const newCurveA = new THREE.CatmullRomCurve3(ptsA, false);
      const newCurveB = new THREE.CatmullRomCurve3(ptsB, false);

      // Instead of rebuilding TubeGeometry every frame (expensive),
      // we update strand particles and bridges which give the motion illusion
      // while tubes rotate smoothly

      // ── Update strand glow particles ────────────────────────────
      const sPos = strandPGeom.attributes.position as THREE.Float32BufferAttribute;
      for (let i = 0; i < STRAND_PARTICLES; i++) {
        const t = i / (STRAND_PARTICLES - 1);
        const angleA = t * Math.PI * 2 * HELIX_TURNS + scrollOffset;
        const angleB = angleA + Math.PI;
        const y = (t - 0.5) * HELIX_HEIGHT;

        // Energy wave
        const wave = Math.sin(t * Math.PI * 8 - elapsed * 4) * 0.5 + 0.5;
        const radiusMod = HELIX_RADIUS * (1 + wave * level * 0.12);

        // Strand A
        const idxA = i * 3;
        sPos.array[idxA] = Math.cos(angleA) * radiusMod;
        sPos.array[idxA + 1] = y;
        sPos.array[idxA + 2] = Math.sin(angleA) * radiusMod;

        // Strand B
        const idxB = (STRAND_PARTICLES + i) * 3;
        sPos.array[idxB] = Math.cos(angleB) * radiusMod;
        sPos.array[idxB + 1] = y;
        sPos.array[idxB + 2] = Math.sin(angleB) * radiusMod;
      }
      sPos.needsUpdate = true;


      // ── Update bridges ──────────────────────────────────────────
      const bPos = bridgeGeom.attributes.position as THREE.Float32BufferAttribute;
      const bCol = bridgeGeom.attributes.color as THREE.Float32BufferAttribute;
      const blPos = bridgeLineGeom.attributes.position as THREE.Float32BufferAttribute;
      const blCol = bridgeLineGeom.attributes.color as THREE.Float32BufferAttribute;

      for (let b = 0; b < BRIDGE_COUNT; b++) {
        const t = (b + 0.5) / BRIDGE_COUNT;
        const angleA = t * Math.PI * 2 * HELIX_TURNS + scrollOffset;
        const angleB = angleA + Math.PI;
        const y = (t - 0.5) * HELIX_HEIGHT;

        // Bridge energy pulse
        const pulse = Math.sin(b * 2.1 + elapsed * 5) * 0.5 + 0.5;
        const energy = pulse * (0.4 + level * 0.6);

        // Start and end points of bridge
        const ax = Math.cos(angleA) * HELIX_RADIUS;
        const az = Math.sin(angleA) * HELIX_RADIUS;
        const bx = Math.cos(angleB) * HELIX_RADIUS;
        const bz = Math.sin(angleB) * HELIX_RADIUS;

        // Bridge line endpoints
        const blIdx = b * 6;
        blPos.array[blIdx] = ax; blPos.array[blIdx + 1] = y; blPos.array[blIdx + 2] = az;
        blPos.array[blIdx + 3] = bx; blPos.array[blIdx + 4] = y; blPos.array[blIdx + 5] = bz;

        // Bridge line colors (white-ish with energy)
        const whiteLevel = 0.5 + energy * 0.5;
        blCol.array[blIdx] = cA.r * whiteLevel;
        blCol.array[blIdx + 1] = cA.g * whiteLevel;
        blCol.array[blIdx + 2] = cA.b * whiteLevel;
        blCol.array[blIdx + 3] = cB.r * whiteLevel;
        blCol.array[blIdx + 4] = cB.g * whiteLevel;
        blCol.array[blIdx + 5] = cB.b * whiteLevel;

        // Bridge dots (interpolated between strands)
        for (let d = 0; d < BRIDGE_DOTS; d++) {
          const lerp = d / (BRIDGE_DOTS - 1);
          const idx = (b * BRIDGE_DOTS + d) * 3;
          bPos.array[idx] = ax + (bx - ax) * lerp;
          bPos.array[idx + 1] = y;
          bPos.array[idx + 2] = az + (bz - az) * lerp;

          // Color gradient from cyan to orange
          const centerGlow = 1 - Math.abs(lerp - 0.5) * 2;
          const brightness = 0.4 + energy * centerGlow * 0.6;
          bCol.array[idx] = (cA.r * (1 - lerp) + cB.r * lerp) * brightness;
          bCol.array[idx + 1] = (cA.g * (1 - lerp) + cB.g * lerp) * brightness;
          bCol.array[idx + 2] = (cA.b * (1 - lerp) + cB.b * lerp) * brightness;
        }
      }
      bPos.needsUpdate = true;
      bCol.needsUpdate = true;
      blPos.needsUpdate = true;
      blCol.needsUpdate = true;


      // ── Update network particles (gentle drift) ─────────────────
      const nPos = netGeom.attributes.position as THREE.Float32BufferAttribute;
      for (let i = 0; i < NET_PARTICLES; i++) {
        const sp = netSpeeds[i];
        const idx = i * 3;
        nPos.array[idx] += sp.vx;
        nPos.array[idx + 1] += sp.vy + Math.sin(elapsed * 0.3 + sp.phase) * 0.0005;
        nPos.array[idx + 2] += sp.vz;

        // Soft bound (keep particles in sphere)
        const x = nPos.array[idx], y = nPos.array[idx + 1], z = nPos.array[idx + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 4.5) {
          const scale = 3.5 / dist;
          nPos.array[idx] *= scale;
          nPos.array[idx + 1] *= scale;
          nPos.array[idx + 2] *= scale;
        }
      }
      nPos.needsUpdate = true;

      // ── Update sparse connections ───────────────────────────────
      const cPos = connGeom.attributes.position as THREE.Float32BufferAttribute;
      const cCol = connGeom.attributes.color as THREE.Float32BufferAttribute;
      let ci = 0;
      const maxConn = 60;
      const maxDist = 1.5;

      for (let i = 0; i < NET_PARTICLES && ci < maxConn; i++) {
        for (let j = i + 1; j < NET_PARTICLES && ci < maxConn; j++) {
          const dx = nPos.array[i * 3] - nPos.array[j * 3];
          const dy = nPos.array[i * 3 + 1] - nPos.array[j * 3 + 1];
          const dz = nPos.array[i * 3 + 2] - nPos.array[j * 3 + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < maxDist) {
            const fade = (1 - d / maxDist) * 0.3;
            const idx = ci * 6;
            cPos.array[idx] = nPos.array[i * 3];
            cPos.array[idx + 1] = nPos.array[i * 3 + 1];
            cPos.array[idx + 2] = nPos.array[i * 3 + 2];
            cPos.array[idx + 3] = nPos.array[j * 3];
            cPos.array[idx + 4] = nPos.array[j * 3 + 1];
            cPos.array[idx + 5] = nPos.array[j * 3 + 2];
            cCol.array[idx] = cA.r * fade;
            cCol.array[idx + 1] = cA.g * fade;
            cCol.array[idx + 2] = cA.b * fade;
            cCol.array[idx + 3] = cB.r * fade;
            cCol.array[idx + 4] = cB.g * fade;
            cCol.array[idx + 5] = cB.b * fade;
            ci++;
          }
        }
      }
      // Zero out unused
      for (let i = ci * 6; i < maxConn * 6; i++) { cPos.array[i] = 0; cCol.array[i] = 0; }
      cPos.needsUpdate = true;
      cCol.needsUpdate = true;


      // ── Update halo and materials with audio ────────────────────
      haloMat.uniforms.uTime.value = elapsed;
      haloMat.uniforms.uIntensity.value = 0.04 + level * 0.08;

      // Tube glow responds to audio
      tubeGlowMatA.opacity = 0.12 + level * 0.2;
      tubeGlowMatB.opacity = 0.12 + level * 0.2;
      tubeMatA.opacity = 0.75 + level * 0.2;
      tubeMatB.opacity = 0.75 + level * 0.2;

      // Strand particle size with audio
      strandPMat.size = 0.06 + level * 0.04;
      strandPMat.opacity = 0.7 + level * 0.3;

      // Bridge intensity with audio
      bridgeMat.opacity = 0.5 + level * 0.4;
      bridgeLineMat.opacity = 0.3 + level * 0.4;

      // Base glow with audio
      baseGlowMat.opacity = 0.15 + level * 0.2;
      baseMat.opacity = 0.35 + level * 0.25;

      // ── Rotation — slow majestic spin ───────────────────────────
      helixGroup.rotation.y = elapsed * 0.12;
      helixGroup.rotation.x = 0.15 + Math.sin(elapsed * 0.06) * 0.04;

      // Network gentle rotation
      netPoints.rotation.y = elapsed * 0.02;
      connLines.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);


    // ── Cleanup ───────────────────────────────────────────────────
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      ro.disconnect();

      // Dispose geometries
      tubeGeomA.dispose(); tubeGlowGeomA.dispose();
      tubeGeomB.dispose(); tubeGlowGeomB.dispose();
      strandPGeom.dispose();
      bridgeGeom.dispose(); bridgeLineGeom.dispose();
      netGeom.dispose(); connGeom.dispose();
      baseGeom.dispose(); baseGlowGeom.dispose();
      haloGeom.dispose();

      // Dispose materials
      tubeMatA.dispose(); tubeGlowMatA.dispose();
      tubeMatB.dispose(); tubeGlowMatB.dispose();
      strandPMat.dispose();
      bridgeMat.dispose(); bridgeLineMat.dispose();
      netMat.dispose(); connMat.dispose();
      baseMat.dispose(); baseGlowMat.dispose();
      haloMat.dispose();

      // Dispose texture
      glowTexture.dispose();

      // Remove from DOM
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      freq = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ── Audio setup (Oracle voice or microphone) ───────────────────
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let localAnalyser: AnalyserNode | null = null;
    let ownedMicStream: MediaStream | null = null;
    let cancelled = false;

    const attach = (stream: MediaStream) => {
      if (cancelled) return;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new Ctx();
      source = audioContext.createMediaStreamSource(stream);
      localAnalyser = audioContext.createAnalyser();
      localAnalyser.fftSize = 256;
      source.connect(localAnalyser);
      analyserRef.current = localAnalyser;
      void audioContext.resume().catch(() => undefined);
    };

    if (audioStream) {
      attach(audioStream);
    } else if (enableMic && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
          ownedMicStream = stream;
          attach(stream);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      if (analyserRef.current === localAnalyser) analyserRef.current = null;
      try { source?.disconnect(); localAnalyser?.disconnect(); } catch { /* noop */ }
      ownedMicStream?.getTracks().forEach((tr) => tr.stop());
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, [audioStream, enableMic]);

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
