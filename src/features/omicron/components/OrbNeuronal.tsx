/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useRef } from 'react';
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
//   - Buttery smooth rotation with lerp-based interpolation
//   - Manual touch-drag rotation (pointer events) with long inertia
//   - Circular glowing nodes (canvas-generated radial gradient texture)
//   - Strong depth perception (back-face dimmer via fog + additive blending)
//   - Bright glowing center core with ambient halo
//   - Subtle thin edges (nodes are the visual stars)
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

// ── Create circular glow texture using canvas ───────────────────────
function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Radial gradient: bright white center -> transparent edge
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function OrbNeuronal({
  nodes,
  activeNodeId = null,
  onNodeTap,
  voiceLevel = 0,
  isListening = false,
  onProjectedPositions,
  notifications = {},
  userColor = '#a0aec0',
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

    // Atmospheric fog for depth fade (back-face nodes fade into darkness)
    scene.fog = new THREE.FogExp2(0x000206, 0.15);

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

    // Wireframe edges - thin and subtle (nodes are the stars, not edges)
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      fog: true,
    });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    // Initial rotation offset so the sphere shows 3D perspective immediately
    wireframe.rotation.x = 0.3;
    wireframe.rotation.y = 0.5;
    scene.add(wireframe);

    // ── Node sprites (glowing circular dots at vertices) ────────────
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

    // Circular glow texture for round nodes (not squares)
    const glowTexture = createGlowTexture();

    const dotMat = new THREE.PointsMaterial({
      color,
      size: 0.18,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    dots.rotation.copy(wireframe.rotation);
    scene.add(dots);

    // ── No core — clean wireframe + glowing nodes only ────────────────

    // ── Hub node positions (Fibonacci on sphere surface) ─────────────
    const hubPositions = fibonacciSphere(Math.max(nodeCount, 1), radius * 0.98);

    // ── Raycaster for tap detection ─────────────────────────────────
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.2 };
    const mouse = new THREE.Vector2();

    // ── Touch-drag rotation (buttery smooth with lerp targets) ───────
    let isDragging = false;
    let hasCaptured = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragBaseRotationX = wireframe.rotation.x;
    let dragBaseRotationY = wireframe.rotation.y;
    let velocityX = 0;
    let velocityY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;
    let pointerMoved = false;

    // Separate target rotation values (key to smooth motion)
    // During drag: we set targets. In animate: we LERP actual toward targets.
    let targetRotationX = wireframe.rotation.x;
    let targetRotationY = wireframe.rotation.y;
    // Actual rendered rotation (lerps toward target)
    let currentRotationX = wireframe.rotation.x;
    let currentRotationY = wireframe.rotation.y;

    function handlePointerDown(e: PointerEvent) {
      isDragging = true;
      hasCaptured = false;
      pointerMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragBaseRotationX = currentRotationX;
      dragBaseRotationY = currentRotationY;
      targetRotationX = currentRotationX;
      targetRotationY = currentRotationY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTime = performance.now();
      velocityX = 0;
      velocityY = 0;
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

      // Rotation sensitivity
      const sensitivity = 0.012;
      targetRotationY = dragBaseRotationY + dx * sensitivity;
      targetRotationX = dragBaseRotationX + dy * sensitivity;

      // Track velocity for inertia after release
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
    const autoRotationSpeed = 0.002;
    // Lerp factor for buttery smooth interpolation (lower = smoother/laggier)
    const lerpFactor = 0.12;

    function animate() {
      frameId = requestAnimationFrame(animate);
      time += 0.016;

      if (isDragging) {
        // During drag: lerp actual rotation toward target (creates smooth feel)
        currentRotationX += (targetRotationX - currentRotationX) * lerpFactor;
        currentRotationY += (targetRotationY - currentRotationY) * lerpFactor;
      } else {
        const voiceBoost = voiceLevelRef.current * 0.008;

        // Apply inertia from drag (keeps spinning with 0.992 decay = much longer)
        if (Math.abs(velocityX) > 0.00005 || Math.abs(velocityY) > 0.00005) {
          targetRotationY += velocityX * 0.25;
          targetRotationX += velocityY * 0.25;
          // Long decay for satisfying spin
          velocityX *= 0.992;
          velocityY *= 0.992;
        } else {
          // Default auto-rotation with slight organic variation
          const organicWobble = Math.sin(time * 0.2) * 0.0004;
          targetRotationY += autoRotationSpeed + voiceBoost + organicWobble;
        }

        // Subtle oscillation on X axis for organic breathing feel
        targetRotationX += Math.cos(time * 0.25) * 0.00015;

        // Lerp actual toward target (smooth even in auto-rotation mode)
        currentRotationX += (targetRotationX - currentRotationX) * lerpFactor;
        currentRotationY += (targetRotationY - currentRotationY) * lerpFactor;
      }

      // Apply smooth rotation
      wireframe.rotation.x = currentRotationX;
      wireframe.rotation.y = currentRotationY;

      // Sync dots rotation
      dots.rotation.copy(wireframe.rotation);

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

      // Edge breathing opacity (subtle, range 0.25-0.55)
      edgesMat.opacity = 0.4 + Math.sin(time * 0.7) * 0.15;

      // Dot constant full brightness
      dotMat.opacity = 1.0;
      dotMat.size = 0.18 + Math.sin(time * 1.1) * 0.02;

      // Update color if changed
      const c = new THREE.Color(userColorRef.current);
      if (!edgesMat.color.equals(c)) {
        edgesMat.color.copy(c);
        dotMat.color.copy(c);
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
      // Dispose all scene children (meshes, materials, geometries)
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
      scene.clear();
      glowTexture.dispose();
      geo.dispose();
      edgesGeo.dispose();
      edgesMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      renderer.dispose();
      // Force release WebGL context to prevent "too many contexts" warning
      renderer.forceContextLoss();
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
