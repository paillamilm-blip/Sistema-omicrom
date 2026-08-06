import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =====================================================================
// <ParticleOrb /> — ADN de Mercurio Vivo Bioluminiscente
//
// Dirección visual: Metal líquido orgánico que CONTIENE las competencias
// del usuario. Cada capacidad es una "cápsula" incrustada en la hélice
// que se ilumina con bioluminiscencia cuando se activa.
//
// Estructura:
//   - Cadenas de mercurio líquido (chrome reflectivo + fluid motion)
//   - Cápsulas de competencias incrustadas (glow interior orgánico)
//   - Puentes tipo sinapsis (filamentos que brillan entre activas)
//   - Fondo limpio: negro profundo con breath de color
//   - Audio-reactivo: todo vibra orgánicamente con la voz
//
// No cyberpunk. No neón. Orgánico, vivo, premium.
// =====================================================================

/** Una competencia que vive dentro del ADN */
export interface HelixSkill {
  id: string;
  label: string;
  /** 0-1: nivel de dominio (afecta tamaño de la cápsula) */
  level?: number;
}

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  /** Competencias que existen dentro del ADN */
  skills?: HelixSkill[];
  /** IDs de competencias activamente iluminadas (interacción) */
  activeSkillIds?: string[];
  /** Intensidad global de bioluminiscencia (0-1). Default 0 = reposo */
  glowIntensity?: number;
  className?: string;
}

export default function ParticleOrb({
  audioStream = null,
  enableMic = false,
  skills = [],
  activeSkillIds = [],
  glowIntensity = 0,
  className,
}: ParticleOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Refs para comunicar estado reactivo al loop de animación
  const activeIdsRef = useRef<string[]>(activeSkillIds);
  const glowRef = useRef(glowIntensity);
  activeIdsRef.current = activeSkillIds;
  glowRef.current = glowIntensity;


  // ── Three.js Scene ─────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Palette (no cyberpunk — organic mercury + bioluminescence) ──
    const MERCURY = new THREE.Color(0.78, 0.8, 0.82);       // chrome/silver
    const BIO_GREEN = new THREE.Color(0.1, 0.85, 0.55);     // emerald bioluminescence
    const BIO_CYAN = new THREE.Color(0.15, 0.7, 0.8);       // deep cyan organic
    const BIO_PULSE = new THREE.Color(0.2, 0.95, 0.65);     // bright pulse
    const DARK_TEAL = new THREE.Color(0.02, 0.06, 0.08);    // background hint

    // ── Scene, Camera, Renderer ─────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 18);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.3, 5.8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // ── Configuration ───────────────────────────────────────────────
    const HELIX_TURNS = 4;
    const HELIX_HEIGHT = 5.0;
    const HELIX_RADIUS = 0.75;
    const TUBE_RADIUS = 0.055;
    const TUBE_SEGMENTS = 180;
    const CAPSULE_COUNT = Math.max(skills.length, 8); // min 8 capsules
    const BRIDGE_COUNT = 20;
    const SYNAPSE_PARTICLES = 40; // sparse organic background


    // ── Main Group ──────────────────────────────────────────────────
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    // ── Glow texture (soft organic) ─────────────────────────────────
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d')!;
    const grd = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.1, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.25)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    gCtx.fillStyle = grd;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    // ── Helper: helix curve points ──────────────────────────────────
    const helixPts = (offset: number, segs: number): THREE.Vector3[] => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
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


    // ── Mercury Shader Material ─────────────────────────────────────
    // Chrome-like reflective material with organic vertex displacement
    const mercuryVertexShader = `
      uniform float uTime;
      uniform float uAudioLevel;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vDisplacement;

      // Simplex-like noise for organic displacement
      float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z);
      }

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;

        // Organic fluid displacement (mercury ripple)
        float n = noise3D(pos * 3.0 + uTime * 0.8) * 0.5 +
                  noise3D(pos * 6.0 - uTime * 1.2) * 0.25;
        float displacement = n * (0.008 + uAudioLevel * 0.015);
        pos += normal * displacement;
        vDisplacement = displacement;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const mercuryFragmentShader = `
      uniform vec3 uMercuryColor;
      uniform vec3 uBioColor;
      uniform float uTime;
      uniform float uAudioLevel;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vDisplacement;

      void main() {
        // Fresnel rim (chrome reflection simulation)
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

        // Mercury base: silver with subtle environment color shift
        vec3 envColor = mix(uMercuryColor, uBioColor, fresnel * 0.3);

        // Subtle rainbow iridescence on edges (organic, not harsh)
        float irid = sin(dot(vNormal, vec3(1.0)) * 4.0 + uTime * 0.5) * 0.5 + 0.5;
        vec3 iridescentColor = mix(
          vec3(0.7, 0.8, 0.85),
          mix(uBioColor, vec3(0.3, 0.5, 0.9), irid),
          fresnel * 0.4
        );

        // Combine: chrome center + iridescent edges
        vec3 finalColor = mix(envColor, iridescentColor, fresnel);

        // Audio-reactive glow pulse (organic breathing)
        float pulse = sin(vWorldPos.y * 2.0 + uTime * 2.0) * 0.5 + 0.5;
        finalColor += uBioColor * pulse * uAudioLevel * 0.15;

        // Opacity: solid center, slightly transparent at edges
        float alpha = 0.85 + fresnel * 0.15;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;


    // ── Strand A — Mercury Tube ─────────────────────────────────────
    const curveA = new THREE.CatmullRomCurve3(helixPts(0, TUBE_SEGMENTS), false);
    const tubeGeomA = new THREE.TubeGeometry(curveA as any, TUBE_SEGMENTS, TUBE_RADIUS, 12, false);
    const tubeMatA = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uMercuryColor: { value: MERCURY },
        uBioColor: { value: BIO_CYAN },
      },
      vertexShader: mercuryVertexShader,
      fragmentShader: mercuryFragmentShader,
      transparent: true,
    });
    const tubeA = new THREE.Mesh(tubeGeomA, tubeMatA);
    helixGroup.add(tubeA);

    // ── Strand B — Mercury Tube ─────────────────────────────────────
    const curveB = new THREE.CatmullRomCurve3(helixPts(Math.PI, TUBE_SEGMENTS), false);
    const tubeGeomB = new THREE.TubeGeometry(curveB as any, TUBE_SEGMENTS, TUBE_RADIUS, 12, false);
    const tubeMatB = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uMercuryColor: { value: MERCURY },
        uBioColor: { value: BIO_GREEN },
      },
      vertexShader: mercuryVertexShader,
      fragmentShader: mercuryFragmentShader,
      transparent: true,
    });
    const tubeB = new THREE.Mesh(tubeGeomB, tubeMatB);
    helixGroup.add(tubeB);

    // ── Outer glow (subtle bloom around mercury) ────────────────────
    const glowTubeGeomA = new THREE.TubeGeometry(curveA as any, TUBE_SEGMENTS, TUBE_RADIUS * 2.5, 8, false);
    const glowTubeMatA = new THREE.MeshBasicMaterial({
      color: BIO_CYAN,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowTubeA = new THREE.Mesh(glowTubeGeomA, glowTubeMatA);
    helixGroup.add(glowTubeA);

    const glowTubeGeomB = new THREE.TubeGeometry(curveB as any, TUBE_SEGMENTS, TUBE_RADIUS * 2.5, 8, false);
    const glowTubeMatB = new THREE.MeshBasicMaterial({
      color: BIO_GREEN,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowTubeB = new THREE.Mesh(glowTubeGeomB, glowTubeMatB);
    helixGroup.add(glowTubeB);


    // ── Capsules (competencias incrustadas en la hélice) ─────────────
    // Each capsule is a sphere at a point along the helix, with an inner
    // glow that activates when the skill is in activeSkillIds
    const capsuleFragShader = `
      uniform vec3 uBaseColor;
      uniform vec3 uGlowColor;
      uniform float uActivation; // 0 = dormant, 1 = full bioluminescence
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPos;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vPos);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

        // Dormant: translucent dark crystal
        vec3 dormant = uBaseColor * 0.3 + fresnel * uBaseColor * 0.2;
        float dormantAlpha = 0.25 + fresnel * 0.2;

        // Active: bioluminescent glow from inside
        float pulse = sin(uTime * 3.0) * 0.15 + 0.85;
        vec3 active = uGlowColor * pulse * (0.8 + fresnel * 0.5);
        float activeAlpha = 0.6 + fresnel * 0.4;

        // Mix based on activation
        vec3 color = mix(dormant, active, uActivation);
        float alpha = mix(dormantAlpha, activeAlpha, uActivation);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    const capsuleVertShader = `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

    type CapsuleData = {
      mesh: THREE.Mesh;
      glowMesh: THREE.Mesh;
      material: THREE.ShaderMaterial;
      glowMaterial: THREE.MeshBasicMaterial;
      skillId: string;
      t: number; // position along helix (0-1)
      strandIdx: number; // 0 = A, 1 = B
    };

    const capsules: CapsuleData[] = [];
    const capsuleGeom = new THREE.SphereGeometry(0.06, 16, 16);
    const capsuleGlowGeom = new THREE.SphereGeometry(0.12, 12, 12);

    for (let i = 0; i < CAPSULE_COUNT; i++) {
      const skill = skills[i] || { id: `empty-${i}`, label: '', level: 0.5 };
      const t = (i + 0.5) / CAPSULE_COUNT;
      const strandIdx = i % 2; // alternate between strands
      const offset = strandIdx === 0 ? 0 : Math.PI;
      const angle = t * Math.PI * 2 * HELIX_TURNS + offset;
      const y = (t - 0.5) * HELIX_HEIGHT;
      const size = 0.5 + (skill.level ?? 0.5) * 0.5; // 0.5-1.0 scale

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uBaseColor: { value: new THREE.Color(0.1, 0.2, 0.25) },
          uGlowColor: { value: strandIdx === 0 ? BIO_CYAN.clone() : BIO_GREEN.clone() },
          uActivation: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: capsuleVertShader,
        fragmentShader: capsuleFragShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(capsuleGeom, mat);
      mesh.position.set(
        Math.cos(angle) * HELIX_RADIUS,
        y,
        Math.sin(angle) * HELIX_RADIUS,
      );
      mesh.scale.setScalar(size);
      helixGroup.add(mesh);

      // Outer bioluminescent glow (only visible when active)
      const glowMat = new THREE.MeshBasicMaterial({
        color: strandIdx === 0 ? BIO_CYAN : BIO_GREEN,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(capsuleGlowGeom, glowMat);
      glowMesh.position.copy(mesh.position);
      glowMesh.scale.setScalar(size);
      helixGroup.add(glowMesh);

      capsules.push({ mesh, glowMesh, material: mat, glowMaterial: glowMat, skillId: skill.id, t, strandIdx });
    }


    // ── Synapse Bridges (organic filaments between strands) ──────────
    const bridgePositions = new Float32Array(BRIDGE_COUNT * 2 * 3);
    const bridgeColors = new Float32Array(BRIDGE_COUNT * 2 * 3);
    const bridgeGeom = new THREE.BufferGeometry();
    bridgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(bridgePositions, 3));
    bridgeGeom.setAttribute('color', new THREE.Float32BufferAttribute(bridgeColors, 3));
    const bridgeMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      linewidth: 1,
    });
    const bridgeLines = new THREE.LineSegments(bridgeGeom, bridgeMat);
    helixGroup.add(bridgeLines);

    // Synapse particles along bridges (organic dots like nerve impulses)
    const synapseDotsPositions = new Float32Array(BRIDGE_COUNT * 4 * 3); // 4 dots per bridge
    const synapseDotsColors = new Float32Array(BRIDGE_COUNT * 4 * 3);
    const synapseDotGeom = new THREE.BufferGeometry();
    synapseDotGeom.setAttribute('position', new THREE.Float32BufferAttribute(synapseDotsPositions, 3));
    synapseDotGeom.setAttribute('color', new THREE.Float32BufferAttribute(synapseDotsColors, 3));
    const synapseDotMat = new THREE.PointsMaterial({
      size: 0.025,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    (synapseDotMat as any).map = glowTexture;
    const synapseDots = new THREE.Points(synapseDotGeom, synapseDotMat);
    helixGroup.add(synapseDots);


    // ── Ambient spore particles (sparse organic background) ──────────
    const sporePositions = new Float32Array(SYNAPSE_PARTICLES * 3);
    const sporeSpeeds: { vx: number; vy: number; vz: number; phase: number }[] = [];
    for (let i = 0; i < SYNAPSE_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 2.5;
      sporePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      sporePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      sporePositions[i * 3 + 2] = r * Math.cos(phi);
      sporeSpeeds.push({
        vx: (Math.random() - 0.5) * 0.0008,
        vy: (Math.random() - 0.5) * 0.0005,
        vz: (Math.random() - 0.5) * 0.0008,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const sporeGeom = new THREE.BufferGeometry();
    sporeGeom.setAttribute('position', new THREE.Float32BufferAttribute(sporePositions, 3));
    const sporeMat = new THREE.PointsMaterial({
      size: 0.02,
      color: BIO_GREEN,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    (sporeMat as any).map = glowTexture;
    const spores = new THREE.Points(sporeGeom, sporeMat);
    scene.add(spores);

    // ── Ambient halo (very subtle breath) ────────────────────────────
    const haloGeom = new THREE.SphereGeometry(2.2, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor: { value: DARK_TEAL },
        uBioColor: { value: BIO_GREEN },
        uIntensity: { value: 0.03 },
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
        uniform vec3 uColor;
        uniform vec3 uBioColor;
        uniform float uIntensity;
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          rim = pow(rim, 4.0);
          float breath = sin(uTime * 0.8) * 0.3 + 0.7;
          vec3 color = mix(uColor, uBioColor, rim * 0.5);
          gl_FragColor = vec4(color, rim * uIntensity * breath);
        }
      `,
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    scene.add(haloMesh);


    // ── Resize ──────────────────────────────────────────────────────
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

    // ── Animation state ─────────────────────────────────────────────
    let freq: Uint8Array | null = null;
    const clock = new THREE.Clock();

    // ── Animation loop ──────────────────────────────────────────────
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Audio level (0..1)
      let level = 0.05 + Math.sin(elapsed * 0.8) * 0.02; // organic breath
      const analyser = analyserRef.current;
      if (analyser) {
        const bins = analyser.frequencyBinCount;
        if (!freq || freq.length !== bins) freq = new Uint8Array(bins);
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        level = Math.min(1, (sum / freq.length) / 52);
      }

      // External glow intensity
      const extGlow = glowRef.current;
      const combinedGlow = Math.max(level, extGlow);

      // ── Update mercury shader uniforms ────────────────────────────
      tubeMatA.uniforms.uTime.value = elapsed;
      tubeMatA.uniforms.uAudioLevel.value = combinedGlow;
      tubeMatB.uniforms.uTime.value = elapsed;
      tubeMatB.uniforms.uAudioLevel.value = combinedGlow;

      // Glow tubes respond to intensity
      glowTubeMatA.opacity = 0.04 + combinedGlow * 0.12;
      glowTubeMatB.opacity = 0.04 + combinedGlow * 0.12;


      // ── Update capsules (bioluminescence activation) ──────────────
      const currentActive = activeIdsRef.current;
      for (const cap of capsules) {
        const isActive = currentActive.includes(cap.skillId);
        const targetActivation = isActive ? 1.0 : extGlow * 0.15; // dormant still has faint life

        // Smooth lerp toward target
        const current = cap.material.uniforms.uActivation.value as number;
        cap.material.uniforms.uActivation.value = current + (targetActivation - current) * 0.05;
        cap.material.uniforms.uTime.value = elapsed;

        // Outer glow opacity follows activation
        cap.glowMaterial.opacity = (cap.material.uniforms.uActivation.value as number) * 0.4;

        // Pulse scale when active
        const pulseScale = isActive
          ? 1.0 + Math.sin(elapsed * 4 + cap.t * 10) * 0.15
          : 0.9 + combinedGlow * 0.1;
        const baseScale = 0.5 + ((skills[capsules.indexOf(cap)]?.level ?? 0.5) * 0.5);
        cap.mesh.scale.setScalar(baseScale * pulseScale);
        cap.glowMesh.scale.setScalar(baseScale * pulseScale * 1.6);

        // Update position (rotate with helix)
        const offset = cap.strandIdx === 0 ? 0 : Math.PI;
        const angle = cap.t * Math.PI * 2 * HELIX_TURNS + offset;
        const y = (cap.t - 0.5) * HELIX_HEIGHT;
        cap.mesh.position.set(Math.cos(angle) * HELIX_RADIUS, y, Math.sin(angle) * HELIX_RADIUS);
        cap.glowMesh.position.copy(cap.mesh.position);
      }


      // ── Update synapse bridges ────────────────────────────────────
      const bPos = bridgeGeom.attributes.position as THREE.Float32BufferAttribute;
      const bCol = bridgeGeom.attributes.color as THREE.Float32BufferAttribute;
      const sdPos = synapseDotGeom.attributes.position as THREE.Float32BufferAttribute;
      const sdCol = synapseDotGeom.attributes.color as THREE.Float32BufferAttribute;

      for (let b = 0; b < BRIDGE_COUNT; b++) {
        const t = (b + 0.5) / BRIDGE_COUNT;
        const angleA = t * Math.PI * 2 * HELIX_TURNS;
        const angleB = angleA + Math.PI;
        const y = (t - 0.5) * HELIX_HEIGHT;

        const ax = Math.cos(angleA) * HELIX_RADIUS;
        const az = Math.sin(angleA) * HELIX_RADIUS;
        const bx = Math.cos(angleB) * HELIX_RADIUS;
        const bz = Math.sin(angleB) * HELIX_RADIUS;

        // Bridge pulse (organic wave)
        const wave = Math.sin(t * Math.PI * 6 + elapsed * 2.5) * 0.5 + 0.5;
        const bridgeGlow = wave * (0.15 + combinedGlow * 0.5);

        // Line endpoints
        const li = b * 6;
        bPos.array[li] = ax; bPos.array[li + 1] = y; bPos.array[li + 2] = az;
        bPos.array[li + 3] = bx; bPos.array[li + 4] = y; bPos.array[li + 5] = bz;

        // Colors
        bCol.array[li] = BIO_CYAN.r * bridgeGlow;
        bCol.array[li + 1] = BIO_CYAN.g * bridgeGlow;
        bCol.array[li + 2] = BIO_CYAN.b * bridgeGlow;
        bCol.array[li + 3] = BIO_GREEN.r * bridgeGlow;
        bCol.array[li + 4] = BIO_GREEN.g * bridgeGlow;
        bCol.array[li + 5] = BIO_GREEN.b * bridgeGlow;

        // Synapse dots traveling along bridge (nerve impulse effect)
        for (let d = 0; d < 4; d++) {
          const impulseT = ((elapsed * 1.5 + b * 0.3 + d * 0.25) % 1.0);
          const di = (b * 4 + d) * 3;
          sdPos.array[di] = ax + (bx - ax) * impulseT;
          sdPos.array[di + 1] = y;
          sdPos.array[di + 2] = az + (bz - az) * impulseT;

          const impulseGlow = bridgeGlow * (1 - Math.abs(impulseT - 0.5) * 2);
          sdCol.array[di] = BIO_PULSE.r * impulseGlow;
          sdCol.array[di + 1] = BIO_PULSE.g * impulseGlow;
          sdCol.array[di + 2] = BIO_PULSE.b * impulseGlow;
        }
      }
      bPos.needsUpdate = true;
      bCol.needsUpdate = true;
      sdPos.needsUpdate = true;
      sdCol.needsUpdate = true;
      bridgeMat.opacity = 0.15 + combinedGlow * 0.35;
      synapseDotMat.opacity = 0.2 + combinedGlow * 0.5;


      // ── Update spore particles (organic float) ────────────────────
      const spPos = sporeGeom.attributes.position as THREE.Float32BufferAttribute;
      for (let i = 0; i < SYNAPSE_PARTICLES; i++) {
        const sp = sporeSpeeds[i];
        const idx = i * 3;
        spPos.array[idx] += sp.vx;
        spPos.array[idx + 1] += sp.vy + Math.sin(elapsed * 0.4 + sp.phase) * 0.0003;
        spPos.array[idx + 2] += sp.vz;

        // Soft boundary
        const x = spPos.array[idx], y = spPos.array[idx + 1], z = spPos.array[idx + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 4.5) {
          const s = 3.0 / dist;
          spPos.array[idx] *= s;
          spPos.array[idx + 1] *= s;
          spPos.array[idx + 2] *= s;
        }
      }
      spPos.needsUpdate = true;
      sporeMat.opacity = 0.15 + combinedGlow * 0.15;

      // ── Update halo ───────────────────────────────────────────────
      haloMat.uniforms.uTime.value = elapsed;
      haloMat.uniforms.uIntensity.value = 0.02 + combinedGlow * 0.06;

      // ── Rotation — slow organic spin ──────────────────────────────
      helixGroup.rotation.y = elapsed * 0.08; // very slow — organic, not mechanical
      helixGroup.rotation.x = 0.12 + Math.sin(elapsed * 0.04) * 0.03;

      // Spores drift independently
      spores.rotation.y = elapsed * 0.015;

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);


    // ── Cleanup ─────────────────────────────────────────────────────
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      ro.disconnect();

      tubeGeomA.dispose(); tubeGeomB.dispose();
      glowTubeGeomA.dispose(); glowTubeGeomB.dispose();
      capsuleGeom.dispose(); capsuleGlowGeom.dispose();
      bridgeGeom.dispose(); synapseDotGeom.dispose();
      sporeGeom.dispose(); haloGeom.dispose();

      tubeMatA.dispose(); tubeMatB.dispose();
      glowTubeMatA.dispose(); glowTubeMatB.dispose();
      bridgeMat.dispose(); synapseDotMat.dispose();
      sporeMat.dispose(); haloMat.dispose();
      capsules.forEach(c => { c.material.dispose(); c.glowMaterial.dispose(); });

      glowTexture.dispose();
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
