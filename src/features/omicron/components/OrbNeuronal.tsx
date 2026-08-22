// @ts-nocheck
import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { TabId } from '@/types';

// =====================================================================
// <OrbNeuronal /> — Geodesic 3D Orb (Landing Pro)
//
// A real 3D geodesic sphere (icosahedron subdivided) rendered with Three.js.
// Wireframe with glowing vertices at each intersection.
// Style: the reference image — network globe with bright nodes + edges.
//
// Features:
//   - Rotates smoothly (autoRotate with inertia)
//   - Nodes glow with user's chosen color
//   - Edges pulse subtly (breathing)
//   - Reacts to voice (vibration on wireframe)
//   - Tap detection on nodes (raycasting)
//   - Grows denser with more skills (subdivisions)
//   - Projects 2D positions for HTML labels
// =====================================================================

export interface OrbNode {
  id: string;
  label: string;
  tab: TabId;
  icon: string;
  level?: number;
  nextStep?: string;
}

export interface OrbNeuronalProps {
  nodes: OrbNode[];
  activeNodeId?: string | null;
  onNodeTap?: (node: OrbNode) => void;
  voiceLevel?: number;
  isListening?: boolean;
  onProjectedPositions?: (positions: { id: string; x: number; y: number; depth: number }[]) => void;
  notifications?: Record<string, number>;
  userColor?: string;
  className?: string;
}

// ── Distribute nodes on sphere using Fibonacci ──────────────────────
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
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
  onProjectedPositions,
  notifications = {},
  userColor = '#5cc8ff',
  className,
}: OrbNeuronalProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const voiceLevelRef = useRef(voiceLevel);
  const isListeningRef = useRef(isListening);
  const activeNodeRef = useRef(activeNodeId);
  const onNodeTapRef = useRef(onNodeTap);
  const onProjectedRef = useRef(onProjectedPositions);
  const notificationsRef = useRef(notifications);
  const userColorRef = useRef(userColor);
  const cleanupRef = useRef<(() => void) | null>(null);

  voiceLevelRef.current = voiceLevel;
  isListeningRef.current = isListening;
  activeNodeRef.current = activeNodeId;
  onNodeTapRef.current = onNodeTap;
  onProjectedRef.current = onProjectedPositions;
  notificationsRef.current = notifications;
  userColorRef.current = userColor;

  const nodeCount = nodes.length;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // ── Scene setup ─────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Geodesic sphere (icosahedron wireframe) ─────────────────────
    const radius = 1.6;
    const detail = nodeCount > 20 ? 2 : nodeCount > 10 ? 1 : 1;
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const color = new THREE.Color(userColorRef.current);

    // Wireframe edges
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
    });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    scene.add(wireframe);

    // ── Node sprites (glowing dots at vertices) ─────────────────────
    const positions = geo.getAttribute('position');
    const vertexCount = positions.count;
    const uniqueVerts: THREE.Vector3[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < vertexCount; i++) {
      const v = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
      const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVerts.push(v);
      }
    }

    // Create point cloud for vertices
    const dotGeo = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(uniqueVerts.length * 3);
    uniqueVerts.forEach((v, i) => {
      dotPositions[i * 3] = v.x;
      dotPositions[i * 3 + 1] = v.y;
      dotPositions[i * 3 + 2] = v.z;
    });
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));

    const dotMat = new THREE.PointsMaterial({
      color,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    scene.add(dots);

    // ── Core glow (center sphere) ───────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // ── Hub node positions (Fibonacci on sphere surface) ─────────────
    const hubPositions = fibonacciSphere(Math.max(nodeCount, 1), radius * 0.98);

    // ── Raycaster for tap detection ─────────────────────────────────
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.2 };
    const mouse = new THREE.Vector2();

    function handleClick(e: MouseEvent | TouchEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      let cx: number, cy: number;
      if ('touches' in e) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = e.clientX - rect.left;
        cy = e.clientY - rect.top;
      }
      mouse.x = (cx / rect.width) * 2 - 1;
      mouse.y = -(cy / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Find closest hub node to click
      let closestDist = Infinity;
      let closestIdx = -1;
      hubPositions.forEach((pos, i) => {
        if (i >= nodeCount) return;
        const screenPos = pos.clone().applyMatrix4(wireframe.matrixWorld).project(camera);
        const dx = screenPos.x - mouse.x;
        const dy = screenPos.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.15 && dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });

      if (closestIdx >= 0 && closestIdx < nodes.length) {
        onNodeTapRef.current?.(nodes[closestIdx]);
      }
    }

    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('touchstart', handleClick, { passive: true });

    // ── Animation loop ──────────────────────────────────────────────
    let frameId: number;
    let time = 0;
    const rotationSpeed = 0.003;

    function animate() {
      frameId = requestAnimationFrame(animate);
      time += 0.016;

      // Rotation
      const voiceBoost = voiceLevelRef.current * 0.01;
      wireframe.rotation.y += rotationSpeed + voiceBoost;
      wireframe.rotation.x = Math.sin(time * 0.2) * 0.05;
      dots.rotation.copy(wireframe.rotation);
      core.rotation.copy(wireframe.rotation);

      // Breathing (core pulse)
      const breath = 0.12 + Math.sin(time * 1.5) * 0.05;
      coreMat.opacity = breath;
      core.scale.setScalar(1 + Math.sin(time * 1.2) * 0.08);

      // Voice vibration
      if (voiceLevelRef.current > 0.1) {
        const shake = voiceLevelRef.current * 0.02;
        wireframe.position.x = (Math.random() - 0.5) * shake;
        wireframe.position.y = (Math.random() - 0.5) * shake;
        dots.position.copy(wireframe.position);
      } else {
        wireframe.position.set(0, 0, 0);
        dots.position.set(0, 0, 0);
      }

      // Edge breathing opacity
      edgesMat.opacity = 0.3 + Math.sin(time * 0.8) * 0.08;

      // Update color if changed
      const c = new THREE.Color(userColorRef.current);
      if (!edgesMat.color.equals(c)) {
        edgesMat.color.copy(c);
        dotMat.color.copy(c);
        coreMat.color.copy(c);
      }

      // Project hub positions to 2D for labels
      if (onProjectedRef.current && nodes.length > 0) {
        const projected = hubPositions.slice(0, nodes.length).map((pos, i) => {
          const worldPos = pos.clone();
          worldPos.applyEuler(wireframe.rotation);
          const screenPos = worldPos.clone().project(camera);
          return {
            id: nodes[i]?.id ?? `node-${i}`,
            x: (screenPos.x * 0.5 + 0.5) * width,
            y: (-screenPos.y * 0.5 + 0.5) * height,
            depth: (screenPos.z + 1) / 2, // 0=front, 1=back
          };
        });
        onProjectedRef.current(projected);
      }

      renderer.render(scene, camera);
    }

    animate();

    // ── Resize handler ──────────────────────────────────────────────
    function handleResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w && h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    }
    window.addEventListener('resize', handleResize);

    // ── Cleanup ─────────────────────────────────────────────────────
    cleanupRef.current = () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('touchstart', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geo.dispose();
      edgesGeo.dispose();
      edgesMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => { cleanupRef.current?.(); };
  }, [nodeCount, nodes]); // Recreate when node count changes significantly

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}
