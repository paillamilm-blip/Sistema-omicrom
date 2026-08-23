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
//   - Manual touch-drag rotation (pointer events)
//   - Initial camera angle (not straight-on) for immediate 3D feel
//   - Back-face vertices dimmer/smaller for depth perception
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
    // Camera slightly above and to the right for 3D depth feel (not frontal)
    camera.position.set(0.8, 1.0, 4.2);
    camera.lookAt(0, 0, 0);

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
    // Initial rotation offset so the sphere shows 3D perspective immediately
    wireframe.rotation.x = 0.3;
    wireframe.rotation.y = 0.5;
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

    // Create point cloud for vertices with per-vertex sizes for depth effect
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
    dots.rotation.copy(wireframe.rotation);
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

    // ── Touch-drag rotation (manual OrbitControls-like behavior) ─────
    let isDragging = false;
    let hasCaptured = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragRotationX = wireframe.rotation.x;
    let dragRotationY = wireframe.rotation.y;
    let velocityX = 0;
    let velocityY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;
    let pointerMoved = false;
    // Lerp targets for smooth interpolation
    let targetRotationX = wireframe.rotation.x;
    let targetRotationY = wireframe.rotation.y;

    function handlePointerDown(e: PointerEvent) {
      isDragging = true;
      hasCaptured = false;
      pointerMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragRotationX = wireframe.rotation.x;
      dragRotationY = wireframe.rotation.y;
      targetRotationX = wireframe.rotation.x;
      targetRotationY = wireframe.rotation.y;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTime = performance.now();
      velocityX = 0;
      velocityY = 0;
      // Don't capture immediately; wait to determine if horizontal drag
    }

    function handlePointerMove(e: PointerEvent) {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      // Smart capture: only capture pointer if clearly horizontal (not vertical scroll)
      if (!hasCaptured && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical movement dominates - let the page scroll, cancel drag
          isDragging = false;
          return;
        }
        // Horizontal movement dominates - capture the pointer
        hasCaptured = true;
        try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
      }

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        pointerMoved = true;
      }

      // Rotation sensitivity (3x more responsive for mobile touch)
      const sensitivity = 0.015;
      targetRotationY = dragRotationY + dx * sensitivity;
      targetRotationX = dragRotationX + dy * sensitivity;

      // Track velocity for inertia
      const now = performance.now();
      const dt = now - lastPointerTime;
      if (dt > 0) {
        velocityX = (e.clientX - lastPointerX) / dt;
        velocityY = (e.clientY - lastPointerY) / dt;
      }
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTime = now;
    }

    function handlePointerUp(e: PointerEvent) {
      isDragging = false;
      if (hasCaptured) {
        try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      }
      hasCaptured = false;
    }

    // Click/tap detection (only if not dragged)
    function handleClick(e: MouseEvent | TouchEvent) {
      // If user dragged, don't fire tap
      if (pointerMoved) return;

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

    // Register pointer events for touch-drag
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('touchstart', handleClick, { passive: true });

    // ── Animation loop ──────────────────────────────────────────────
    let frameId: number;
    let time = 0;
    const autoRotationSpeed = 0.003;

    function animate() {
      frameId = requestAnimationFrame(animate);
      time += 0.016;

      // Auto-rotation (gentle constant spin + voice boost)
      if (isDragging) {
        // Lerp smoothing: interpolate towards target instead of jumping directly
        const lerpFactor = 0.25;
        wireframe.rotation.x += (targetRotationX - wireframe.rotation.x) * lerpFactor;
        wireframe.rotation.y += (targetRotationY - wireframe.rotation.y) * lerpFactor;
      } else {
        const voiceBoost = voiceLevelRef.current * 0.01;

        // Apply inertia from drag (keeps spinning longer with 0.98 decay)
        if (Math.abs(velocityX) > 0.0001 || Math.abs(velocityY) > 0.0001) {
          wireframe.rotation.y += velocityX * 0.3;
          wireframe.rotation.x += velocityY * 0.3;
          // Decay inertia (0.98 = keeps spinning longer, feels more natural)
          velocityX *= 0.98;
          velocityY *= 0.98;
        } else {
          // Default auto-rotation
          wireframe.rotation.y += autoRotationSpeed + voiceBoost;
        }

        // Subtle oscillation on X axis for organic feel
        wireframe.rotation.x += Math.cos(time * 0.3) * 0.0003;
      }

      // Sync dots and core rotation
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

      // Edge breathing opacity (sin wave 0.2-0.5)
      edgesMat.opacity = 0.35 + Math.sin(time * 0.8) * 0.15;

      // Vertex depth-based opacity: back-face dimmer, front brighter
      // We vary the global dot opacity based on a camera-facing heuristic
      // (PointsMaterial doesn't support per-vertex opacity without custom shaders,
      // but sizeAttenuation makes back-face dots smaller, giving depth illusion)
      dotMat.opacity = 0.85 + Math.sin(time * 1.0) * 0.1;

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
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
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
