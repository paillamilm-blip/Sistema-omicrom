import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { TabId } from '../../types';

// =====================================================================
// <OrbNeuronal /> — La app ES el orbe.
//
// Una esfera neuronal 3D donde cada nodo es un hub/sección de la app.
// El usuario interactúa directamente con el orbe:
//   - Tap en un nodo → el orbe gira, muestra preview flotante
//   - Hablar → las partículas vibran como Jarvis
//   - Idle → respira orgánicamente, conexiones pulsan
//
// Fondo negro. Solo el orbe. Nada más.
// =====================================================================

/** Definición de un nodo dentro del orbe */
export interface OrbNode {
  id: string;
  label: string;
  tab: TabId;
  /** Emoji o initial para renderizar en el nodo */
  icon: string;
}

export interface OrbNeuronalProps {
  /** Nodos que componen el orbe (las secciones de la app) */
  nodes: OrbNode[];
  /** Nodo actualmente seleccionado (primer plano) */
  activeNodeId?: string | null;
  /** Callback cuando el usuario toca un nodo */
  onNodeTap?: (node: OrbNode) => void;
  /** 0-1: nivel de vibración (voz del Oráculo) */
  voiceLevel?: number;
  /** Si el Oráculo está escuchando */
  isListening?: boolean;
  className?: string;
}

// ── Fibonacci sphere distribution (even spacing on sphere) ──────────
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1 to 1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push(new THREE.Vector3(
      Math.cos(theta) * radiusAtY * radius,
      y * radius,
      Math.sin(theta) * radiusAtY * radius,
    ));
  }
  return points;
}

export default function OrbNeuronal({
  nodes,
  activeNodeId = null,
  onNodeTap,
  voiceLevel = 0,
  isListening = false,
  className,
}: OrbNeuronalProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const voiceLevelRef = useRef(voiceLevel);
  const isListeningRef = useRef(isListening);
  const activeNodeRef = useRef(activeNodeId);
  const onNodeTapRef = useRef(onNodeTap);

  // Keep refs in sync without re-triggering effect
  voiceLevelRef.current = voiceLevel;
  isListeningRef.current = isListening;
  activeNodeRef.current = activeNodeId;
  onNodeTapRef.current = onNodeTap;


  // ── Three.js Scene ───────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Palette ─────────────────────────────────────────────────────────
    const COL_NODE = new THREE.Color(0.35, 0.85, 0.95);       // cyan orgánico
    const COL_NODE_ACTIVE = new THREE.Color(0.3, 1.0, 0.7);   // green bioluminiscente
    const COL_CONN = new THREE.Color(0.15, 0.4, 0.5);         // teal tenue
    const COL_PULSE = new THREE.Color(0.4, 0.95, 0.8);        // pulse brillante
    const COL_VOICE = new THREE.Color(0.2, 0.6, 1.0);         // azul Jarvis

    // ── Scene ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none'; // prevent scroll on touch

    // ── Config ──────────────────────────────────────────────────────────
    const ORB_RADIUS = 1.4;
    const NODE_SIZE = 0.12;
    const PARTICLE_COUNT = 120; // neural network ambient particles
    const nodeCount = nodes.length;


    // ── Glow texture ────────────────────────────────────────────────────
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d')!;
    const grd = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.12, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    gCtx.fillStyle = grd;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    // ── Main group (rotates) ────────────────────────────────────────────
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // ── Node positions (Fibonacci sphere for even distribution) ──────────
    const nodePositions = fibonacciSphere(nodeCount, ORB_RADIUS);

    // ── Node spheres (main interactive elements) ────────────────────────
    const nodeVertShader = `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

    const nodeFragShader = `
      uniform vec3 uColor;
      uniform float uActivation;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

        // Core glow
        float pulse = sin(uTime * 3.0 + length(vWorldPos) * 2.0) * 0.1 + 0.9;
        vec3 color = uColor * (0.6 + uActivation * 0.4) * pulse;

        // Rim light
        color += uColor * fresnel * (0.3 + uActivation * 0.7);

        float alpha = 0.7 + fresnel * 0.3 + uActivation * 0.2;
        gl_FragColor = vec4(color, alpha);
      }
    `;

    type NodeData = {
      mesh: THREE.Mesh;
      glowMesh: THREE.Mesh;
      material: THREE.ShaderMaterial;
      glowMat: THREE.MeshBasicMaterial;
      basePos: THREE.Vector3;
      node: OrbNode;
      activation: number; // 0-1 current
    };

    const nodeDatas: NodeData[] = [];
    const nodeGeom = new THREE.SphereGeometry(NODE_SIZE, 20, 20);
    const nodeGlowGeom = new THREE.SphereGeometry(NODE_SIZE * 2.5, 12, 12);

    for (let i = 0; i < nodeCount; i++) {
      const pos = nodePositions[i];
      const node = nodes[i];

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: COL_NODE.clone() },
          uActivation: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: nodeVertShader,
        fragmentShader: nodeFragShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(nodeGeom, mat);
      mesh.position.copy(pos);
      (mesh as any).userData = { nodeIndex: i };
      orbGroup.add(mesh);

      // Outer glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: COL_NODE,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(nodeGlowGeom, glowMat);
      glowMesh.position.copy(pos);
      orbGroup.add(glowMesh);

      nodeDatas.push({ mesh, glowMesh, material: mat, glowMat, basePos: pos.clone(), node, activation: 0 });
    }


    // ── Neural connections (lines between nearby nodes) ──────────────────
    const connPairs: [number, number][] = [];
    // Connect each node to its 2-3 nearest neighbors
    for (let i = 0; i < nodeCount; i++) {
      const distances: { idx: number; dist: number }[] = [];
      for (let j = 0; j < nodeCount; j++) {
        if (i === j) continue;
        distances.push({ idx: j, dist: nodePositions[i].distanceTo(nodePositions[j]) });
      }
      distances.sort((a, b) => a.dist - b.dist);
      const connectTo = Math.min(3, distances.length);
      for (let k = 0; k < connectTo; k++) {
        const pair: [number, number] = [Math.min(i, distances[k].idx), Math.max(i, distances[k].idx)];
        if (!connPairs.some(p => p[0] === pair[0] && p[1] === pair[1])) {
          connPairs.push(pair);
        }
      }
    }

    const connPositions = new Float32Array(connPairs.length * 2 * 3);
    const connColors = new Float32Array(connPairs.length * 2 * 3);
    for (let c = 0; c < connPairs.length; c++) {
      const [a, b] = connPairs[c];
      const pa = nodePositions[a];
      const pb = nodePositions[b];
      const idx = c * 6;
      connPositions[idx] = pa.x; connPositions[idx + 1] = pa.y; connPositions[idx + 2] = pa.z;
      connPositions[idx + 3] = pb.x; connPositions[idx + 4] = pb.y; connPositions[idx + 5] = pb.z;
      connColors[idx] = COL_CONN.r; connColors[idx + 1] = COL_CONN.g; connColors[idx + 2] = COL_CONN.b;
      connColors[idx + 3] = COL_CONN.r; connColors[idx + 4] = COL_CONN.g; connColors[idx + 5] = COL_CONN.b;
    }
    const connGeom = new THREE.BufferGeometry();
    connGeom.setAttribute('position', new THREE.Float32BufferAttribute(connPositions, 3));
    connGeom.setAttribute('color', new THREE.Float32BufferAttribute(connColors, 3));
    const connMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const connLines = new THREE.LineSegments(connGeom, connMat);
    orbGroup.add(connLines);


    // ── Ambient particles (neural dust floating inside orb) ──────────────
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleSpeeds: { vx: number; vy: number; vz: number; phase: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * ORB_RADIUS * 0.9;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
      particleSpeeds.push({
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
        vz: (Math.random() - 0.5) * 0.002,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.02,
      color: COL_CONN,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    (particleMat as any).map = glowTexture;
    const particles = new THREE.Points(particleGeom, particleMat);
    orbGroup.add(particles);

    // ── Outer shell (faint wireframe sphere to define boundary) ──────────
    const shellGeom = new THREE.SphereGeometry(ORB_RADIUS * 1.02, 24, 24);
    const shellMat = new THREE.MeshBasicMaterial({
      color: COL_CONN,
      transparent: true,
      opacity: 0.04,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(shellGeom, shellMat);
    orbGroup.add(shell);


    // ── Raycaster for node tap detection ─────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector3();

    const handlePointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer as any, camera);
      const meshes = nodeDatas.map(n => n.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as any;
        const nodeIndex = hit.userData?.nodeIndex;
        if (nodeIndex !== undefined && onNodeTapRef.current) {
          onNodeTapRef.current(nodes[nodeIndex]);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // ── Rotation target (smooth rotation toward active node) ─────────────
    let targetRotY = 0;
    let targetRotX = 0;
    let currentRotY = 0;
    let currentRotX = 0;


    // ── Resize ──────────────────────────────────────────────────────────
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

    // ── Clock ───────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    // ── Animation loop ──────────────────────────────────────────────────
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const voice = voiceLevelRef.current;
      const listening = isListeningRef.current;
      const activeId = activeNodeRef.current;

      // ── Jarvis vibration (voice reactive) ─────────────────────────────
      // When listening or voice active, particles jitter and nodes pulse
      const jarvisIntensity = listening ? 0.3 + voice * 0.7 : voice * 0.5;

      // ── Smooth rotation toward active node ────────────────────────────
      if (activeId) {
        const activeIdx = nodes.findIndex(n => n.id === activeId);
        if (activeIdx >= 0) {
          const pos = nodePositions[activeIdx];
          // Calculate angles to bring node to front (z-forward)
          targetRotY = -Math.atan2(pos.x, pos.z);
          targetRotX = -Math.asin(pos.y / ORB_RADIUS) * 0.5;
        }
      } else {
        // Idle: slow ambient rotation
        targetRotY = elapsed * 0.06;
        targetRotX = Math.sin(elapsed * 0.03) * 0.1;
      }

      // Smooth lerp rotation
      currentRotY += (targetRotY - currentRotY) * 0.03;
      currentRotX += (targetRotX - currentRotX) * 0.03;
      orbGroup.rotation.y = currentRotY;
      orbGroup.rotation.x = currentRotX;


      // ── Update nodes ──────────────────────────────────────────────────
      for (let i = 0; i < nodeDatas.length; i++) {
        const nd = nodeDatas[i];
        const isActive = nd.node.id === activeId;
        const targetAct = isActive ? 1.0 : 0.0;

        // Smooth activation lerp
        nd.activation += (targetAct - nd.activation) * 0.06;
        nd.material.uniforms.uActivation.value = nd.activation;
        nd.material.uniforms.uTime.value = elapsed;

        // Color shift: active = green bioluminescent, idle = cyan
        const col = nd.material.uniforms.uColor.value as THREE.Color;
        if (isActive) {
          col.lerp(COL_NODE_ACTIVE, 0.08);
        } else {
          col.lerp(COL_NODE, 0.04);
        }

        // Scale pulse (active nodes are larger)
        const baseScale = 1 + nd.activation * 0.6;
        const breathScale = 1 + Math.sin(elapsed * 2 + i) * 0.04;
        const jarvisScale = 1 + jarvisIntensity * Math.sin(elapsed * 12 + i * 2) * 0.08;
        const s = baseScale * breathScale * jarvisScale;
        nd.mesh.scale.set(s, s, s);

        // Glow follows activation
        nd.glowMat.opacity = 0.05 + nd.activation * 0.2 + jarvisIntensity * 0.05;
        nd.glowMesh.scale.set(s * 1.2, s * 1.2, s * 1.2);

        // Jarvis: node positions jitter when voice active
        if (jarvisIntensity > 0.05) {
          const jitter = jarvisIntensity * 0.03;
          nd.mesh.position.set(
            nd.basePos.x + Math.sin(elapsed * 15 + i * 3) * jitter,
            nd.basePos.y + Math.cos(elapsed * 13 + i * 5) * jitter,
            nd.basePos.z + Math.sin(elapsed * 17 + i * 7) * jitter,
          );
          nd.glowMesh.position.copy(nd.mesh.position);
        } else {
          nd.mesh.position.copy(nd.basePos);
          nd.glowMesh.position.copy(nd.basePos);
        }
      }


      // ── Update connections (pulse when Jarvis speaks) ──────────────────
      const cCol = connGeom.attributes.color as THREE.Float32BufferAttribute;
      for (let c = 0; c < connPairs.length; c++) {
        const [a, b] = connPairs[c];
        // Pulse traveling along connections
        const travel = (elapsed * 2 + c * 0.5) % 3.0;
        const pulse = Math.max(0, 1 - Math.abs(travel - 1.5)) * (0.3 + jarvisIntensity * 0.7);

        const idx = c * 6;
        const colR = COL_CONN.r + COL_PULSE.r * pulse;
        const colG = COL_CONN.g + COL_PULSE.g * pulse;
        const colB = COL_CONN.b + COL_PULSE.b * pulse;
        cCol.array[idx] = colR; cCol.array[idx + 1] = colG; cCol.array[idx + 2] = colB;
        cCol.array[idx + 3] = colR; cCol.array[idx + 4] = colG; cCol.array[idx + 5] = colB;
      }
      cCol.needsUpdate = true;
      connMat.opacity = 0.12 + jarvisIntensity * 0.2;

      // ── Update particles (Jarvis vibration) ────────────────────────────
      const pPos = particleGeom.attributes.position as THREE.Float32BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const sp = particleSpeeds[i];
        const idx = i * 3;

        // Normal drift
        pPos.array[idx] += sp.vx;
        pPos.array[idx + 1] += sp.vy + Math.sin(elapsed * 0.5 + sp.phase) * 0.0003;
        pPos.array[idx + 2] += sp.vz;

        // Jarvis vibration: random jitter proportional to voice
        if (jarvisIntensity > 0.05) {
          pPos.array[idx] += Math.sin(elapsed * 20 + i) * jarvisIntensity * 0.005;
          pPos.array[idx + 1] += Math.cos(elapsed * 18 + i * 2) * jarvisIntensity * 0.005;
          pPos.array[idx + 2] += Math.sin(elapsed * 22 + i * 3) * jarvisIntensity * 0.005;
        }

        // Keep inside orb
        const x = pPos.array[idx], y = pPos.array[idx + 1], z = pPos.array[idx + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > ORB_RADIUS * 0.85) {
          const s = ORB_RADIUS * 0.6 / dist;
          pPos.array[idx] *= s;
          pPos.array[idx + 1] *= s;
          pPos.array[idx + 2] *= s;
        }
      }
      pPos.needsUpdate = true;
      particleMat.opacity = 0.2 + jarvisIntensity * 0.25;

      // ── Shell breath ──────────────────────────────────────────────────
      const shellBreath = 1 + Math.sin(elapsed * 0.8) * 0.01 + jarvisIntensity * 0.03;
      shell.scale.set(shellBreath, shellBreath, shellBreath);
      shellMat.opacity = 0.03 + jarvisIntensity * 0.06;

      // ── Voice color shift (Jarvis blue when listening) ────────────────
      if (listening) {
        particleMat.color.lerp(COL_VOICE, 0.05);
        shellMat.color.lerp(COL_VOICE, 0.05);
      } else {
        particleMat.color.lerp(COL_CONN, 0.03);
        shellMat.color.lerp(COL_CONN, 0.03);
      }

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);


    // ── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', resize);
      ro.disconnect();

      nodeGeom.dispose();
      nodeGlowGeom.dispose();
      connGeom.dispose();
      particleGeom.dispose();
      shellGeom.dispose();

      connMat.dispose();
      particleMat.dispose();
      shellMat.dispose();
      nodeDatas.forEach(nd => { nd.material.dispose(); nd.glowMat.dispose(); });

      glowTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
