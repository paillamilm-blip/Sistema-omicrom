import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =====================================================================
// <ParticleOrb /> — Esfera de Mercurio Vivo Bioluminiscente (Ω)
//
// Dirección visual: Esfera orgánica de metal líquido que CONTIENE las
// competencias del usuario. Cada capacidad es una "cápsula" distribuida
// en la superficie (Fibonacci sphere) que brilla con bioluminiscencia
// cuando se activa.
//
// Estructura:
//   - Esfera central de mercurio (chrome reflectivo + fluid displacement)
//   - Cápsulas de competencias en la superficie (glow interior orgánico)
//   - Filamentos de sinapsis entre cápsulas cercanas
//   - Fondo limpio: negro profundo con breath de color
//   - Audio-reactivo: todo vibra orgánicamente con la voz
//
// Forma coherente con la marca Ω (esférica, no helicoidal/espiral).
// No cyberpunk. No neón. Orgánico, vivo, premium.
// =====================================================================

/** Una competencia que vive en la esfera */
export interface HelixSkill {
  id: string;
  label: string;
  /** 0-1: nivel de dominio (afecta tamaño de la cápsula) */
  level?: number;
}

export interface ParticleOrbProps {
  audioStream?: MediaStream | null;
  enableMic?: boolean;
  /** Competencias distribuidas en la esfera */
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
  const activeIdsRef = useRef<string[]>(activeSkillIds);
  const glowRef = useRef(glowIntensity);
  activeIdsRef.current = activeSkillIds;
  glowRef.current = glowIntensity;



  // ── Three.js Scene ─────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Palette (organic mercury + bioluminescence) ─────────────────
    const MERCURY = new THREE.Color(0.18, 0.28, 0.35);       // dark teal-chrome (no blanco)
    const BIO_GREEN = new THREE.Color(0.1, 0.85, 0.55);
    const BIO_CYAN = new THREE.Color(0.15, 0.7, 0.8);
    const DARK_TEAL = new THREE.Color(0.02, 0.06, 0.08);

    // ── Scene, Camera, Renderer ─────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 18);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.1, 3.8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // ── Configuration ───────────────────────────────────────────────
    const SPHERE_RADIUS = 1.4;
    const CAPSULE_COUNT = Math.max(skills.length, 8);
    const SYNAPSE_PARTICLES = 40;

    // ── Main Group ──────────────────────────────────────────────────
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

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



    // ── Fibonacci sphere distribution ───────────────────────────────
    function fibSpherePoint(index: number, total: number, radius: number): THREE.Vector3 {
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (index / (total - 1)) * 2; // -1 to 1
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * index;
      return new THREE.Vector3(
        Math.cos(theta) * r * radius,
        y * radius,
        Math.sin(theta) * r * radius,
      );
    }

    // ── Mercury Sphere (central orb) ────────────────────────────────
    const mercuryVertexShader = `
      uniform float uTime;
      uniform float uAudioLevel;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vDisplacement;

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
        float n = noise3D(pos * 2.5 + uTime * 0.6) * 0.5 +
                  noise3D(pos * 5.0 - uTime * 0.9) * 0.25;
        float displacement = n * (0.03 + uAudioLevel * 0.06);
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
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

        // Base: mezcla de mercurio oscuro + bio cyan (siempre visible)
        vec3 baseColor = mix(uMercuryColor * 0.4, uBioColor * 0.6, 0.35 + fresnel * 0.3);

        // Iridiscencia orgánica en bordes
        float irid = sin(dot(vNormal, vec3(1.0, 0.5, 0.3)) * 5.0 + uTime * 0.4) * 0.5 + 0.5;
        vec3 iridescentColor = mix(uBioColor, vec3(0.3, 0.5, 0.9), irid);

        // Combinar: base + iridiscencia en bordes
        vec3 finalColor = mix(baseColor, iridescentColor, fresnel * 0.6);

        // Breath orgánico (pulso de vida constante, sin audio)
        float breath = sin(uTime * 1.2) * 0.08 + 0.12;
        finalColor += uBioColor * breath;

        // Audio-reactive boost
        float pulse = sin(vWorldPos.y * 3.0 + uTime * 1.5) * 0.5 + 0.5;
        finalColor += uBioColor * pulse * uAudioLevel * 0.2;

        // Glow en bordes (halo rim)
        finalColor += uBioColor * fresnel * 0.35;

        float alpha = 0.88 + fresnel * 0.12;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const sphereGeom = new THREE.SphereGeometry(SPHERE_RADIUS * 0.85, 64, 64);
    const sphereMat = new THREE.ShaderMaterial({
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
    const mercurySphere = new THREE.Mesh(sphereGeom, sphereMat);
    orbGroup.add(mercurySphere);

    // ── Outer glow shell ────────────────────────────────────────────
    const outerGlowGeom = new THREE.SphereGeometry(SPHERE_RADIUS * 0.95, 32, 32);
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: BIO_CYAN,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerGlow = new THREE.Mesh(outerGlowGeom, outerGlowMat);
    orbGroup.add(outerGlow);



    // ── Capsules (competencias en superficie Fibonacci) ──────────────
    const capsuleFragShader = `
      uniform vec3 uBaseColor;
      uniform vec3 uGlowColor;
      uniform float uActivation;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPos;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vPos);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
        vec3 dormant = uBaseColor * 0.3 + fresnel * uBaseColor * 0.2;
        float dormantAlpha = 0.25 + fresnel * 0.2;
        float pulse = sin(uTime * 3.0) * 0.15 + 0.85;
        vec3 lit = uGlowColor * pulse * (0.8 + fresnel * 0.5);
        float litAlpha = 0.6 + fresnel * 0.4;
        vec3 color = mix(dormant, lit, uActivation);
        float alpha = mix(dormantAlpha, litAlpha, uActivation);
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
      basePos: THREE.Vector3;
      index: number;
    };

    const capsules: CapsuleData[] = [];
    const capsuleGeom = new THREE.SphereGeometry(0.06, 16, 16);
    const capsuleGlowGeom = new THREE.SphereGeometry(0.12, 12, 12);

    for (let i = 0; i < CAPSULE_COUNT; i++) {
      const skill = skills[i] || { id: `empty-${i}`, label: '', level: 0.5 };
      const basePos = fibSpherePoint(i, CAPSULE_COUNT, SPHERE_RADIUS);
      const size = 0.5 + (skill.level ?? 0.5) * 0.5;
      const bioColor = i % 2 === 0 ? BIO_CYAN.clone() : BIO_GREEN.clone();

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uBaseColor: { value: new THREE.Color(0.1, 0.2, 0.25) },
          uGlowColor: { value: bioColor },
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
      mesh.position.copy(basePos);
      mesh.scale.setScalar(size);
      orbGroup.add(mesh);

      const glowMat = new THREE.MeshBasicMaterial({
        color: bioColor,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(capsuleGlowGeom, glowMat);
      glowMesh.position.copy(basePos);
      glowMesh.scale.setScalar(size);
      orbGroup.add(glowMesh);

      capsules.push({ mesh, glowMesh, material: mat, glowMaterial: glowMat, skillId: skill.id, basePos, index: i });
    }



    // ── Synapse filaments (connections between nearby capsules) ──────
    const FILAMENT_COUNT = Math.min(CAPSULE_COUNT * 2, 24);
    const filamentPositions = new Float32Array(FILAMENT_COUNT * 2 * 3);
    const filamentColors = new Float32Array(FILAMENT_COUNT * 2 * 3);
    const filamentGeom = new THREE.BufferGeometry();
    filamentGeom.setAttribute('position', new THREE.Float32BufferAttribute(filamentPositions, 3));
    filamentGeom.setAttribute('color', new THREE.Float32BufferAttribute(filamentColors, 3));
    const filamentMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      linewidth: 1,
    });
    const filamentLines = new THREE.LineSegments(filamentGeom, filamentMat);
    orbGroup.add(filamentLines);

    // Pre-compute filament pairs (nearest neighbors)
    const filamentPairs: [number, number][] = [];
    for (let i = 0; i < CAPSULE_COUNT && filamentPairs.length < FILAMENT_COUNT; i++) {
      const next = (i + 1) % CAPSULE_COUNT;
      filamentPairs.push([i, next]);
      if (i + 3 < CAPSULE_COUNT && filamentPairs.length < FILAMENT_COUNT) {
        filamentPairs.push([i, i + 3]);
      }
    }

    // ── Ambient spore particles ─────────────────────────────────────
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sporeMat as any).map = glowTexture;
    const spores = new THREE.Points(sporeGeom, sporeMat);
    scene.add(spores);

    // ── Ambient halo (subtle breath) ────────────────────────────────
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
    let freq: Uint8Array<ArrayBuffer> | null = null;
    const clock = new THREE.Clock();

    // ── Animation loop ──────────────────────────────────────────────
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Audio level (0..1)
      let level = 0.05 + Math.sin(elapsed * 0.8) * 0.02;
      const analyser = analyserRef.current;
      if (analyser) {
        const bins = analyser.frequencyBinCount;
        if (!freq || freq.length !== bins) freq = new Uint8Array(bins) as Uint8Array<ArrayBuffer>;
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        level = Math.min(1, (sum / freq.length) / 52);
      }

      const extGlow = glowRef.current;
      const combinedGlow = Math.max(level, extGlow);

      // ── Update mercury sphere ─────────────────────────────────────
      sphereMat.uniforms.uTime.value = elapsed;
      sphereMat.uniforms.uAudioLevel.value = combinedGlow;
      outerGlowMat.opacity = 0.03 + combinedGlow * 0.1;

      // ── Update capsules ───────────────────────────────────────────
      const currentActive = activeIdsRef.current;
      for (const cap of capsules) {
        const isActive = currentActive.includes(cap.skillId);
        const targetActivation = isActive ? 1.0 : extGlow * 0.15;
        const current = cap.material.uniforms.uActivation.value as number;
        cap.material.uniforms.uActivation.value = current + (targetActivation - current) * 0.05;
        cap.material.uniforms.uTime.value = elapsed;
        cap.glowMaterial.opacity = (cap.material.uniforms.uActivation.value as number) * 0.4;

        // Pulse scale when active
        const pulseScale = isActive
          ? 1.0 + Math.sin(elapsed * 4 + cap.index * 1.2) * 0.15
          : 0.9 + combinedGlow * 0.1;
        const baseScale = 0.5 + ((skills[cap.index]?.level ?? 0.5) * 0.5);
        cap.mesh.scale.setScalar(baseScale * pulseScale);
        cap.glowMesh.scale.setScalar(baseScale * pulseScale * 1.6);

        // Capsules float slightly (organic breath on sphere surface)
        const breathOffset = Math.sin(elapsed * 0.7 + cap.index * 0.8) * 0.02;
        const dir = cap.basePos.clone().normalize();
        cap.mesh.position.copy(cap.basePos).add(dir.multiplyScalar(breathOffset));
        cap.glowMesh.position.copy(cap.mesh.position);
      }

      // ── Update filaments ──────────────────────────────────────────
      const fPos = filamentGeom.attributes.position as THREE.Float32BufferAttribute;
      const fCol = filamentGeom.attributes.color as THREE.Float32BufferAttribute;
      for (let f = 0; f < filamentPairs.length && f < FILAMENT_COUNT; f++) {
        const [a, b] = filamentPairs[f];
        const posA = capsules[a]?.mesh.position;
        const posB = capsules[b]?.mesh.position;
        if (!posA || !posB) continue;
        const li = f * 6;
        fPos.array[li] = posA.x; fPos.array[li + 1] = posA.y; fPos.array[li + 2] = posA.z;
        fPos.array[li + 3] = posB.x; fPos.array[li + 4] = posB.y; fPos.array[li + 5] = posB.z;

        const wave = Math.sin(f * 0.8 + elapsed * 2.0) * 0.5 + 0.5;
        const glow = wave * (0.12 + combinedGlow * 0.4);
        fCol.array[li] = BIO_CYAN.r * glow;
        fCol.array[li + 1] = BIO_CYAN.g * glow;
        fCol.array[li + 2] = BIO_CYAN.b * glow;
        fCol.array[li + 3] = BIO_GREEN.r * glow;
        fCol.array[li + 4] = BIO_GREEN.g * glow;
        fCol.array[li + 5] = BIO_GREEN.b * glow;
      }
      fPos.needsUpdate = true;
      fCol.needsUpdate = true;
      filamentMat.opacity = 0.12 + combinedGlow * 0.3;

      // ── Update spores ─────────────────────────────────────────────
      const spPos = sporeGeom.attributes.position as THREE.Float32BufferAttribute;
      for (let i = 0; i < SYNAPSE_PARTICLES; i++) {
        const sp = sporeSpeeds[i];
        const idx = i * 3;
        spPos.array[idx] += sp.vx;
        spPos.array[idx + 1] += sp.vy + Math.sin(elapsed * 0.4 + sp.phase) * 0.0003;
        spPos.array[idx + 2] += sp.vz;
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

      // ── Rotation — very slow organic spin ─────────────────────────
      orbGroup.rotation.y = elapsed * 0.06;
      orbGroup.rotation.x = 0.08 + Math.sin(elapsed * 0.03) * 0.02;
      spores.rotation.y = elapsed * 0.015;

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // ── Visibility: pause when off-screen (saves GPU) ───────────────
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          renderer.setAnimationLoop(animate);
        } else {
          renderer.setAnimationLoop(null);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(mount);


    // ── Cleanup ─────────────────────────────────────────────────────
    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      ro.disconnect();

      sphereGeom.dispose(); outerGlowGeom.dispose();
      capsuleGeom.dispose(); capsuleGlowGeom.dispose();
      filamentGeom.dispose(); sporeGeom.dispose(); haloGeom.dispose();

      sphereMat.dispose(); outerGlowMat.dispose();
      filamentMat.dispose(); sporeMat.dispose(); haloMat.dispose();
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
