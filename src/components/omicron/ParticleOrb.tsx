import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =====================================================================
// <ParticleOrb /> — ADN Digital 3D con Three.js
//
// Doble hélice neón 3D que rota y vibra con audio. Usa WebGL para
// renderizar: cadenas helicoidales con glow, puentes luminosos entre
// strands, y una red de partículas de datos flotando en el espacio.
//
// Estructura visual:
//   - 2 cadenas helicoidales (strand A cyan / strand B purple) con glow
//   - Puentes neón entre cadenas (base pairs) con efecto bloom
//   - Red de partículas de datos conectadas por líneas tenues
//   - Halo volumétrico central que respira con la voz
// =====================================================================

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  colorA?: [number, number, number]; // strand A (RGB 0-255) — SKY cyan
  colorB?: [number, number, number]; // strand B (RGB 0-255) — INDIGO purple
  className?: string;
}

export default function ParticleOrb({
  audioStream = null,
  enableMic = false,
  colorA = [92, 200, 255],
  colorB = [94, 92, 230],
  className,
}: ParticleOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ── Three.js scene setup + animation ─────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Normalize colors to 0-1
    const cA = new THREE.Color(colorA[0] / 255, colorA[1] / 255, colorA[2] / 255);
    const cB = new THREE.Color(colorB[0] / 255, colorB[1] / 255, colorB[2] / 255);


    // ── Scene, Camera, Renderer ──────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // ── Configuration ────────────────────────────────────────────────
    const STRAND_POINTS = 200;
    const HELIX_TURNS = 4;
    const HELIX_HEIGHT = 6;
    const HELIX_RADIUS = 1.0;
    const BRIDGE_COUNT = 32;
    const BRIDGE_SEGMENTS = 6;
    const NET_PARTICLES = 300;
    const NET_CONNECTIONS = 180;


    // ── Main Group (for rotation) ────────────────────────────────────
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    // ── Custom glow point texture ────────────────────────────────────
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d')!;
    const gradient = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    gCtx.fillStyle = gradient;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);


    // ── Strand A & B — helix point clouds ────────────────────────────
    const strandAPositions = new Float32Array(STRAND_POINTS * 3);
    const strandBPositions = new Float32Array(STRAND_POINTS * 3);
    const strandColors = new Float32Array(STRAND_POINTS * 3);
    const strandBColors = new Float32Array(STRAND_POINTS * 3);

    const strandAGeom = new THREE.BufferGeometry();
    strandAGeom.setAttribute('position', new THREE.Float32BufferAttribute(strandAPositions, 3));
    strandAGeom.setAttribute('color', new THREE.Float32BufferAttribute(strandColors, 3));

    const strandBGeom = new THREE.BufferGeometry();
    strandBGeom.setAttribute('position', new THREE.Float32BufferAttribute(strandBPositions, 3));
    strandBGeom.setAttribute('color', new THREE.Float32BufferAttribute(strandBColors, 3));

    const strandMaterialA = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    // Assign map via any-cast since our shim doesn't declare it
    (strandMaterialA as any).map = glowTexture;

    const strandMaterialB = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (strandMaterialB as any).map = glowTexture;


    const strandAPoints = new THREE.Points(strandAGeom, strandMaterialA);
    const strandBPoints = new THREE.Points(strandBGeom, strandMaterialB);
    helixGroup.add(strandAPoints);
    helixGroup.add(strandBPoints);

    // ── Strand trail lines (glow backbone) ───────────────────────────
    const trailAGeom = new THREE.BufferGeometry();
    trailAGeom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(STRAND_POINTS * 3), 3));
    const trailAMat = new THREE.LineBasicMaterial({
      color: cA,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const trailA = new THREE.Line(trailAGeom, trailAMat);
    helixGroup.add(trailA);

    const trailBGeom = new THREE.BufferGeometry();
    trailBGeom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(STRAND_POINTS * 3), 3));
    const trailBMat = new THREE.LineBasicMaterial({
      color: cB,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const trailB = new THREE.Line(trailBGeom, trailBMat);
    helixGroup.add(trailB);


    // ── Bridges (base pairs between strands) ─────────────────────────
    const bridgePositions = new Float32Array(BRIDGE_COUNT * BRIDGE_SEGMENTS * 3);
    const bridgeColors = new Float32Array(BRIDGE_COUNT * BRIDGE_SEGMENTS * 3);
    const bridgeGeom = new THREE.BufferGeometry();
    bridgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(bridgePositions, 3));
    bridgeGeom.setAttribute('color', new THREE.Float32BufferAttribute(bridgeColors, 3));

    const bridgeMat = new THREE.PointsMaterial({
      size: 0.06,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (bridgeMat as any).map = glowTexture;
    const bridgePoints = new THREE.Points(bridgeGeom, bridgeMat);
    helixGroup.add(bridgePoints);

    // Bridge lines (thin neon connections)
    const bridgeLineIndices: number[] = [];
    for (let b = 0; b < BRIDGE_COUNT; b++) {
      for (let s = 0; s < BRIDGE_SEGMENTS - 1; s++) {
        bridgeLineIndices.push(b * BRIDGE_SEGMENTS + s, b * BRIDGE_SEGMENTS + s + 1);
      }
    }
    const bridgeLineGeom = new THREE.BufferGeometry();
    bridgeLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(BRIDGE_COUNT * BRIDGE_SEGMENTS * 3), 3));
    bridgeLineGeom.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(BRIDGE_COUNT * BRIDGE_SEGMENTS * 3), 3));
    bridgeLineGeom.setIndex(new THREE.Uint16BufferAttribute(bridgeLineIndices, 1));
    const bridgeLineMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const bridgeLines = new THREE.LineSegments(bridgeLineGeom, bridgeLineMat);
    helixGroup.add(bridgeLines);


    // ── Particle network (floating data particles + connections) ──────
    const netPositions = new Float32Array(NET_PARTICLES * 3);
    const netColors = new Float32Array(NET_PARTICLES * 3);
    const netSpeeds: { vx: number; vy: number; vz: number; orbit: number; phase: number }[] = [];

    for (let i = 0; i < NET_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 1.8;
      netPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      netPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      netPositions[i * 3 + 2] = r * Math.cos(phi);
      // Color mix between cyan and purple with variance
      const mix = Math.random();
      netColors[i * 3] = cA.r * (1 - mix) + cB.r * mix;
      netColors[i * 3 + 1] = cA.g * (1 - mix) + cB.g * mix;
      netColors[i * 3 + 2] = cA.b * (1 - mix) + cB.b * mix;
      netSpeeds.push({
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
        vz: (Math.random() - 0.5) * 0.003,
        orbit: 0.1 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const netGeom = new THREE.BufferGeometry();
    netGeom.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
    netGeom.setAttribute('color', new THREE.Float32BufferAttribute(netColors, 3));
    const netMat = new THREE.PointsMaterial({
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (netMat as any).map = glowTexture;
    const netPoints = new THREE.Points(netGeom, netMat);
    scene.add(netPoints);


    // ── Network connection lines ─────────────────────────────────────
    const connLinePositions = new Float32Array(NET_CONNECTIONS * 2 * 3);
    const connLineColors = new Float32Array(NET_CONNECTIONS * 2 * 3);
    const connGeom = new THREE.BufferGeometry();
    connGeom.setAttribute('position', new THREE.Float32BufferAttribute(connLinePositions, 3));
    connGeom.setAttribute('color', new THREE.Float32BufferAttribute(connLineColors, 3));
    const connMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const connLines = new THREE.LineSegments(connGeom, connMat);
    scene.add(connLines);

    // ── Central glow sphere (breath halo) ────────────────────────────
    const glowSphereGeom = new THREE.SphereGeometry(0.4, 32, 32);
    const glowSphereMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor1: { value: cA },
        uColor2: { value: cB },
        uIntensity: { value: 0.3 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uIntensity;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          rim = pow(rim, 2.5);
          vec3 color = mix(uColor1, uColor2, sin(uTime * 0.5) * 0.5 + 0.5);
          float pulse = 0.8 + sin(uTime * 2.0) * 0.2;
          gl_FragColor = vec4(color, rim * uIntensity * pulse);
        }
      `,
    });
    const glowSphere = new THREE.Mesh(glowSphereGeom, glowSphereMat);
    helixGroup.add(glowSphere);


    // ── Outer glow halo (large sphere) ───────────────────────────────
    const haloGeom = new THREE.SphereGeometry(2.8, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor1: { value: cA },
        uColor2: { value: cB },
        uIntensity: { value: 0.08 },
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
          rim = pow(rim, 4.0);
          vec3 color = mix(uColor1, uColor2, 0.5 + sin(uTime * 0.3) * 0.5);
          gl_FragColor = vec4(color, rim * uIntensity);
        }
      `,
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    scene.add(haloMesh);


    // ── Resize handler ───────────────────────────────────────────────
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

    // ── Audio analysis state ─────────────────────────────────────────
    let freq: Uint8Array | null = null;
    const clock = new THREE.Clock();

    // ── Animation loop ───────────────────────────────────────────────
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Audio level (0..1)
      let level = 0.12 + Math.sin(elapsed * 1.2) * 0.04;
      const analyser = analyserRef.current;
      if (analyser) {
        const bins = analyser.frequencyBinCount;
        if (!freq || freq.length !== bins) freq = new Uint8Array(bins);
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        level = Math.min(1, (sum / freq.length) / 52);
      }


      // ── Update helix strands ─────────────────────────────────────────
      const posA = strandAGeom.attributes.position as THREE.Float32BufferAttribute;
      const posB = strandBGeom.attributes.position as THREE.Float32BufferAttribute;
      const colA = strandAGeom.attributes.color as THREE.Float32BufferAttribute;
      const colB = strandBGeom.attributes.color as THREE.Float32BufferAttribute;
      const trailAPos = trailAGeom.attributes.position as THREE.Float32BufferAttribute;
      const trailBPos = trailBGeom.attributes.position as THREE.Float32BufferAttribute;

      for (let i = 0; i < STRAND_POINTS; i++) {
        const progress = i / (STRAND_POINTS - 1);
        const angle = progress * Math.PI * 2 * HELIX_TURNS + elapsed * 0.8;
        const y = (progress - 0.5) * HELIX_HEIGHT;

        // Energy wave along the helix
        const wave = Math.sin(progress * Math.PI * 6 - elapsed * 3) * 0.5 + 0.5;
        const energy = wave * (0.4 + level * 0.6);
        const radiusMod = HELIX_RADIUS * (1 + energy * 0.15 * level);

        // Strand A
        const ax = Math.cos(angle) * radiusMod;
        const az = Math.sin(angle) * radiusMod;
        posA.array[i * 3] = ax;
        posA.array[i * 3 + 1] = y;
        posA.array[i * 3 + 2] = az;
        trailAPos.array[i * 3] = ax;
        trailAPos.array[i * 3 + 1] = y;
        trailAPos.array[i * 3 + 2] = az;

        // Strand B (180 degrees offset)
        const bx = Math.cos(angle + Math.PI) * radiusMod;
        const bz = Math.sin(angle + Math.PI) * radiusMod;
        posB.array[i * 3] = bx;
        posB.array[i * 3 + 1] = y;
        posB.array[i * 3 + 2] = bz;
        trailBPos.array[i * 3] = bx;
        trailBPos.array[i * 3 + 1] = y;
        trailBPos.array[i * 3 + 2] = bz;

        // Colors with energy glow
        const brightness = 0.5 + energy * 0.5;
        colA.array[i * 3] = cA.r * brightness;
        colA.array[i * 3 + 1] = cA.g * brightness;
        colA.array[i * 3 + 2] = cA.b * brightness;
        colB.array[i * 3] = cB.r * brightness;
        colB.array[i * 3 + 1] = cB.g * brightness;
        colB.array[i * 3 + 2] = cB.b * brightness;
      }
      posA.needsUpdate = true;
      posB.needsUpdate = true;
      colA.needsUpdate = true;
      colB.needsUpdate = true;
      trailAPos.needsUpdate = true;
      trailBPos.needsUpdate = true;


      // ── Update bridges ───────────────────────────────────────────────
      const bPos = bridgeGeom.attributes.position as THREE.Float32BufferAttribute;
      const bCol = bridgeGeom.attributes.color as THREE.Float32BufferAttribute;
      const blPos = bridgeLineGeom.attributes.position as THREE.Float32BufferAttribute;
      const blCol = bridgeLineGeom.attributes.color as THREE.Float32BufferAttribute;

      for (let b = 0; b < BRIDGE_COUNT; b++) {
        const progress = (b + 0.5) / BRIDGE_COUNT;
        const angle = progress * Math.PI * 2 * HELIX_TURNS + elapsed * 0.8;
        const y = (progress - 0.5) * HELIX_HEIGHT;
        const bridgeWave = Math.sin(b * 1.5 + elapsed * 4) * 0.5 + 0.5;
        const bridgeEnergy = bridgeWave * (0.3 + level * 0.7);

        for (let s = 0; s < BRIDGE_SEGMENTS; s++) {
          const lerp = s / (BRIDGE_SEGMENTS - 1);
          const bridgeAngle = angle + lerp * Math.PI;
          const r = HELIX_RADIUS * (1 + bridgeEnergy * 0.08);
          const idx = (b * BRIDGE_SEGMENTS + s) * 3;

          const px = Math.cos(bridgeAngle) * r;
          const pz = Math.sin(bridgeAngle) * r;

          bPos.array[idx] = px;
          bPos.array[idx + 1] = y;
          bPos.array[idx + 2] = pz;
          blPos.array[idx] = px;
          blPos.array[idx + 1] = y;
          blPos.array[idx + 2] = pz;

          // Bridge color — golden/white at center, strand colors at edges
          const centerFade = 1 - Math.abs(lerp - 0.5) * 2;
          const glow = bridgeEnergy * centerFade;
          bCol.array[idx] = cA.r * (1 - lerp) + cB.r * lerp + glow * 0.5;
          bCol.array[idx + 1] = cA.g * (1 - lerp) + cB.g * lerp + glow * 0.3;
          bCol.array[idx + 2] = cA.b * (1 - lerp) + cB.b * lerp + glow * 0.1;
          blCol.array[idx] = bCol.array[idx];
          blCol.array[idx + 1] = bCol.array[idx + 1];
          blCol.array[idx + 2] = bCol.array[idx + 2];
        }
      }
      bPos.needsUpdate = true;
      bCol.needsUpdate = true;
      blPos.needsUpdate = true;
      blCol.needsUpdate = true;


      // ── Update network particles ────────────────────────────────────
      const nPos = netGeom.attributes.position as THREE.Float32BufferAttribute;
      for (let i = 0; i < NET_PARTICLES; i++) {
        const sp = netSpeeds[i];
        const idx = i * 3;
        // Orbit around center
        const x = nPos.array[idx];
        const y = nPos.array[idx + 1];
        const z = nPos.array[idx + 2];
        const orbitAngle = elapsed * sp.orbit + sp.phase;
        const dist = Math.sqrt(x * x + y * y + z * z);
        const targetDist = 2.0 + Math.sin(elapsed * 0.5 + sp.phase) * 0.5 + level * 0.8;

        // Gentle drift + orbit
        nPos.array[idx] += sp.vx + Math.cos(orbitAngle) * 0.002 * (1 + level);
        nPos.array[idx + 1] += sp.vy + Math.sin(orbitAngle * 0.7) * 0.001;
        nPos.array[idx + 2] += sp.vz + Math.sin(orbitAngle) * 0.002 * (1 + level);

        // Keep particles in bounds (soft constraint)
        if (dist > 4.0) {
          const scale = targetDist / dist;
          nPos.array[idx] *= 0.99 * scale + 0.01;
          nPos.array[idx + 1] *= 0.99 * scale + 0.01;
          nPos.array[idx + 2] *= 0.99 * scale + 0.01;
        } else if (dist < 1.5) {
          const scale = 1.8 / Math.max(dist, 0.1);
          nPos.array[idx] *= 1.01 * scale;
          nPos.array[idx + 1] *= 1.01 * scale;
          nPos.array[idx + 2] *= 1.01 * scale;
        }
      }
      nPos.needsUpdate = true;


      // ── Update connection lines (nearest neighbors) ─────────────────
      const cPos = connGeom.attributes.position as THREE.Float32BufferAttribute;
      const cCol = connGeom.attributes.color as THREE.Float32BufferAttribute;
      let connIdx = 0;
      const maxDist = 1.2 + level * 0.5;

      for (let i = 0; i < NET_PARTICLES && connIdx < NET_CONNECTIONS; i++) {
        const x1 = nPos.array[i * 3];
        const y1 = nPos.array[i * 3 + 1];
        const z1 = nPos.array[i * 3 + 2];

        for (let j = i + 1; j < NET_PARTICLES && connIdx < NET_CONNECTIONS; j++) {
          const dx = x1 - nPos.array[j * 3];
          const dy = y1 - nPos.array[j * 3 + 1];
          const dz = z1 - nPos.array[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDist) {
            const fade = 1 - dist / maxDist;
            const ci = connIdx * 6; // 2 points * 3 components

            cPos.array[ci] = x1;
            cPos.array[ci + 1] = y1;
            cPos.array[ci + 2] = z1;
            cPos.array[ci + 3] = nPos.array[j * 3];
            cPos.array[ci + 4] = nPos.array[j * 3 + 1];
            cPos.array[ci + 5] = nPos.array[j * 3 + 2];

            // Color fades with distance
            const cr = (cA.r + cB.r) * 0.5 * fade;
            const cg = (cA.g + cB.g) * 0.5 * fade;
            const cb = (cA.b + cB.b) * 0.5 * fade;
            cCol.array[ci] = cr; cCol.array[ci + 1] = cg; cCol.array[ci + 2] = cb;
            cCol.array[ci + 3] = cr; cCol.array[ci + 4] = cg; cCol.array[ci + 5] = cb;

            connIdx++;
          }
        }
      }
      // Zero out unused connections
      for (let i = connIdx * 6; i < NET_CONNECTIONS * 6; i++) {
        cPos.array[i] = 0;
        cCol.array[i] = 0;
      }
      cPos.needsUpdate = true;
      cCol.needsUpdate = true;


      // ── Update glow sphere and halo ──────────────────────────────────
      glowSphereMat.uniforms.uTime.value = elapsed;
      glowSphereMat.uniforms.uIntensity.value = 0.2 + level * 0.6;
      glowSphere.scale.set(1 + level * 0.4, 1 + level * 0.4, 1 + level * 0.4);

      haloMat.uniforms.uTime.value = elapsed;
      haloMat.uniforms.uIntensity.value = 0.04 + level * 0.12;

      // ── Rotate helix group (slow majestic rotation) ────────────────
      helixGroup.rotation.y = elapsed * 0.15;
      helixGroup.rotation.x = 0.3 + Math.sin(elapsed * 0.08) * 0.06;

      // Network particles gentle rotation
      netPoints.rotation.y = elapsed * 0.03;
      connLines.rotation.y = elapsed * 0.03;

      // Strand material size pulse with audio
      strandMaterialA.size = 0.06 + level * 0.06;
      strandMaterialB.size = 0.06 + level * 0.06;
      bridgeMat.size = 0.04 + level * 0.05;
      netMat.size = 0.03 + level * 0.03;

      // Trail opacity with audio
      trailAMat.opacity = 0.25 + level * 0.35;
      trailBMat.opacity = 0.25 + level * 0.35;
      bridgeLineMat.opacity = 0.3 + level * 0.5;
      connMat.opacity = 0.08 + level * 0.15;

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);


    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      ro.disconnect();

      // Dispose geometries
      strandAGeom.dispose();
      strandBGeom.dispose();
      trailAGeom.dispose();
      trailBGeom.dispose();
      bridgeGeom.dispose();
      bridgeLineGeom.dispose();
      netGeom.dispose();
      connGeom.dispose();
      glowSphereGeom.dispose();
      haloGeom.dispose();

      // Dispose materials
      strandMaterialA.dispose();
      strandMaterialB.dispose();
      trailAMat.dispose();
      trailBMat.dispose();
      bridgeMat.dispose();
      bridgeLineMat.dispose();
      netMat.dispose();
      connMat.dispose();
      glowSphereMat.dispose();
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


  // ── Audio setup (Oracle voice or microphone) ─────────────────────
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
