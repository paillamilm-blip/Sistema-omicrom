// src/components/OracleCore3D.tsx
// ═══════════════════════════════════════════════════════════════════════
// 🔮 NÚCLEO 3D — Three.js real: esfera holográfica (fresnel), bloom aditivo,
// partículas volumétricas, red de nodos orbitando en 3D. Premium, vivo.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGemeloProfile } from '../hooks/useGemeloProfile';
import { useApp } from '../store/AppContext';
import type { TabId } from '../types';

const ORB_VERT = `
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const ORB_FRAG = `
uniform float uTime;
uniform vec3 uCore;
uniform vec3 uRim;
uniform vec3 uDeep;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.3);
  float band = 0.5 + 0.5 * sin(vNormal.y * 16.0 - uTime * 2.2);
  band = smoothstep(0.55, 1.0, band) * 0.22;
  float lit = pow(max(dot(vNormal, normalize(vec3(0.35,0.55,0.8))), 0.0), 0.7);
  vec3 base = mix(uDeep, uCore, lit);
  vec3 col = base + uRim * fres * 1.7 + uRim * band;
  gl_FragColor = vec4(col, 0.92 + fres * 0.08);
}`;

const HALO_FRAG = `
uniform vec3 uColor;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
  gl_FragColor = vec4(uColor, f * 0.9);
}`;


// Textura radial suave (glow / partículas) generada en canvas
function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Sprite de texto (título + subtítulo) que siempre mira a cámara
function makeLabelSprite(title: string, sub: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 512, 256);
  g.textAlign = 'center';
  g.shadowColor = color;
  g.shadowBlur = 22;
  g.fillStyle = '#ffffff';
  g.font = '700 72px -apple-system, system-ui, sans-serif';
  g.fillText(title, 256, sub ? 108 : 148);
  if (sub) {
    g.shadowBlur = 0;
    g.fillStyle = color;
    g.font = '600 34px ui-monospace, monospace';
    g.fillText(sub, 256, 168);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(150, 75, 1);
  return s;
}

interface NodeDef {
  id: string; title: string; sub: string; color: string;
  angle: number; radius: number; z: number; r: number; tab: TabId | null;
}


export function OracleCore3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { profile } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();

  const rep = profile.rep;
  const tokens = sb?.token_balance ?? 2480;
  const exp = profile.axes?.execution ?? 120;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 3000);
    camera.position.set(0, 0, 560);

    const glowTex = makeGlowTexture();
    const root = new THREE.Group();
    scene.add(root);

    // ── Núcleo holográfico (esfera con shader fresnel) ──
    const orbMat = new THREE.ShaderMaterial({
      vertexShader: ORB_VERT, fragmentShader: ORB_FRAG, transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uCore: { value: new THREE.Color('#bfe6ff') },
        uRim: { value: new THREE.Color('#3aa0ff') },
        uDeep: { value: new THREE.Color('#08243f') },
      },
    });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(78, 6), orbMat);
    scene.add(orb);


    // Halo interno (fresnel aditivo, backside) → aura viva
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: ORB_VERT, fragmentShader: HALO_FRAG,
      transparent: true, side: THREE.BackSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#4db6ff') } },
    });
    const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(96, 4), haloMat);
    scene.add(halo);

    // Bloom fake: sprite radial aditivo detrás del orbe
    const bloom = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color('#2f8fff'),
      transparent: true, blending: THREE.AdditiveBlending, depthTest: false,
    }));
    bloom.scale.set(520, 520, 1);
    bloom.position.z = -30;
    scene.add(bloom);

    // Número central REP (sprite crisp que mira a cámara)
    const repSprite = makeLabelSprite(String(rep), 'REPUTACIÓN', '#8fd3ff');
    repSprite.scale.set(220, 110, 1);
    repSprite.renderOrder = 20;
    scene.add(repSprite);

    // ── Campo wireframe de profundidad ──
    const field = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(560, 1)),
      new THREE.LineBasicMaterial({ color: 0x1b3a5c, transparent: true, opacity: 0.22 })
    );
    root.add(field);

    // ── Partículas volumétricas ──
    const pCount = 700;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const rad = 260 + Math.random() * 620;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
      pPos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th);
      pPos[i * 3 + 2] = rad * Math.cos(ph);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 3.2, map: glowTex, color: 0x6fc4ff, transparent: true,
      opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    root.add(particles);


    // ── Definición de nodos orbitales ──
    const NODES: NodeDef[] = [
      { id: 'exp', title: String(exp), sub: 'EXPERIENCIA', color: '#4ade80', angle: 0, radius: 215, z: -30, r: 9, tab: 'maxskill' },
      { id: 'ejecuta', title: 'Ejecuta', sub: 'EMPLEOS', color: '#ff9f45', angle: 45, radius: 225, z: 15, r: 10, tab: 'empleos' },
      { id: 'n1', title: 'N1', sub: 'NODO', color: '#5cc8ff', angle: 90, radius: 205, z: 45, r: 8, tab: null },
      { id: 'aprende', title: 'Aprende', sub: 'ACADEMIA', color: '#ff6b6b', angle: 135, radius: 225, z: 15, r: 10, tab: 'academia' },
      { id: 'tokens', title: tokens.toLocaleString(), sub: 'TOKENS Ω', color: '#ffd27a', angle: 180, radius: 215, z: -30, r: 9, tab: 'wallet' },
      { id: 'capitaliza', title: 'Capitaliza', sub: 'BÓVEDA', color: '#5cc8ff', angle: 225, radius: 225, z: 15, r: 10, tab: 'vault' },
      { id: 'g3', title: 'G3', sub: 'NIVEL', color: '#a78bfa', angle: 270, radius: 205, z: 45, r: 8, tab: null },
      { id: 'gobierna', title: 'Gobierna', sub: 'GOBERNANZA', color: '#a78bfa', angle: 315, radius: 225, z: 15, r: 10, tab: 'gobernanza' },
    ];

    const clickable: THREE.Object3D[] = [];
    NODES.forEach(n => {
      const a = (n.angle * Math.PI) / 180;
      const pos = new THREE.Vector3(Math.cos(a) * n.radius, Math.sin(a) * n.radius, n.z);
      const col = new THREE.Color(n.color);

      // línea de energía nodo → centro
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]);
      root.add(new THREE.Line(lg, new THREE.LineBasicMaterial({
        color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending,
      })));

      // esfera nodo
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(n.r, 24, 24),
        new THREE.MeshBasicMaterial({ color: col })
      );
      sphere.position.copy(pos);
      sphere.userData.tab = n.tab;
      clickable.push(sphere);
      root.add(sphere);

      // glow del nodo
      const ng = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: col, transparent: true,
        blending: THREE.AdditiveBlending, depthTest: false,
      }));
      ng.scale.set(n.r * 7, n.r * 7, 1);
      ng.position.copy(pos);
      root.add(ng);

      // etiqueta
      const label = makeLabelSprite(n.title, n.sub, n.color);
      label.position.copy(pos).add(new THREE.Vector3(0, n.r + 26, 0));
      root.add(label);
    });


    // ── Interacción: arrastrar para rotar + auto-rotación ──
    let targetY = 0, targetX = 0.18;
    let dragging = false, moved = false, downX = 0, downY = 0;
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();

    const onDown = (e: PointerEvent) => {
      dragging = true; moved = false; downX = e.clientX; downY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      targetY += dx * 0.006;
      targetX = Math.max(-0.7, Math.min(0.7, targetX + dy * 0.005));
      downX = e.clientX; downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
      if (!moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ptr, camera);
        const hit = raycaster.intersectObjects(clickable, false)[0];
        const tab = hit?.object.userData.tab as TabId | undefined;
        if (tab) setActiveTab(tab);
      }
    };
    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', () => { dragging = false; });

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);


    // ── Loop de render ──
    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      orbMat.uniforms.uTime.value = t;
      orb.rotation.y = t * 0.15;
      orb.rotation.x = t * 0.05;
      if (!dragging) targetY += 0.0016;
      root.rotation.y += (targetY - root.rotation.y) * 0.06;
      root.rotation.x += (targetX - root.rotation.x) * 0.06;
      field.rotation.y = -t * 0.03;
      particles.rotation.y = t * 0.02;
      const pulse = 1 + Math.sin(t * 1.6) * 0.04;
      bloom.scale.set(520 * pulse, 520 * pulse, 1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      renderer.dispose();
      scene.traverse((o) => {
        const any = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
        any.geometry?.dispose?.();
        const m = any.material;
        if (Array.isArray(m)) m.forEach(mm => mm.dispose());
        else m?.dispose?.();
      });
      glowTex.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [rep, tokens, exp, setActiveTab]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />;
}
