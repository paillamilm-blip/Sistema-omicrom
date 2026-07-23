import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =====================================================================
// <DynamicNode /> — Núcleo dinámico reactivo al audio (Three.js + shaders)
//
// Refactor seguro para React 18:
//  1) Encapsulado: el renderer se ancla a un <div> propio vía useRef
//     (NUNCA a document.body).
//  2) Audio seguro: usa el flujo del Oráculo (prop `audioStream`) si se
//     provee; si no, pide permiso de micrófono. Si no hay audio, uAudio=0
//     (el orbe late suave sin romper nada).
//  3) Cleanup estricto: cancela el rAF, hace dispose() de renderer,
//     geometry y material, cierra el AudioContext, corta los tracks del
//     micrófono y quita el canvas del DOM al desmontar → sin fugas.
//  4) Responsivo: reajusta cámara (aspect) y renderer al cambiar el
//     tamaño (ventana + contenedor vía ResizeObserver).
// =====================================================================

export interface DynamicNodeProps {
  /** Flujo de audio del Oráculo. Si se pasa, se usa en vez del micrófono. */
  audioStream?: MediaStream | null;
  /** Pedir permiso de micrófono si no hay `audioStream`. Default: false. */
  enableMic?: boolean;
  /** Color base (silencio). Default: 0x111111 (gris oscuro). */
  baseColor?: number;
  /** Color activo (voz fuerte). Default: 0x00ffcc (cian). */
  activeColor?: number;
  /** Mostrar como malla de alambre. Default: true. */
  wireframe?: boolean;
  /** Clase CSS del contenedor. */
  className?: string;
}

export default function DynamicNode({
  audioStream = null,
  enableMic = false,
  baseColor = 0x111111,
  activeColor = 0x00ffcc,
  wireframe = true,
  className,
}: DynamicNodeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // El AnalyserNode se comparte por ref: el loop de animación (efecto A)
  // lo lee cada cuadro, mientras el efecto de audio (efecto B) lo crea y
  // destruye sin tocar la escena WebGL.
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Uniforms compartidos para poder actualizarlos en vivo (colores/wireframe)
  // sin reconstruir la escena.
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // ── EFECTO A: escena WebGL + animación + resize + cleanup ──────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;

    // Escena, cámara y renderer anclados al contenedor (no al body)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Shaders (GLSL) — deformación por audio + color por distorsión
    const vertexShader = /* glsl */ `
      uniform float uTime;
      uniform float uAudio;
      varying float vDistortion;

      void main() {
        float noise = sin(position.x * 2.0 + uTime)
                    * sin(position.y * 2.0 + uTime)
                    * sin(position.z * 2.0 + uTime);
        float distortion = noise * (uAudio / 50.0);
        vDistortion = distortion;
        vec3 newPosition = position + normal * distortion;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform vec3 uColorBase;
      uniform vec3 uColorActive;
      varying float vDistortion;

      void main() {
        float mixStrength = smoothstep(-0.5, 0.5, vDistortion);
        vec3 finalColor = mix(uColorBase, uColorActive, mixStrength);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms: {
      uTime: { value: number };
      uAudio: { value: number };
      uColorBase: { value: THREE.Color };
      uColorActive: { value: THREE.Color };
    } = {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uColorBase: { value: new THREE.Color(baseColor) },
      uColorActive: { value: new THREE.Color(activeColor) },
    };

    const geometry = new THREE.SphereGeometry(3, 128, 128);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      wireframe,
    });
    materialRef.current = material;

    const dynamicOrb = new THREE.Mesh(geometry, material);
    scene.add(dynamicOrb);

    const clock = new THREE.Clock();
    // Buffer reutilizado para no crear un Uint8Array por cuadro (evita GC churn).
    let freqData: Uint8Array | null = null;
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();

      const analyser = analyserRef.current;
      if (analyser) {
        if (!freqData || freqData.length !== analyser.frequencyBinCount) {
          freqData = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        uniforms.uAudio.value = sum / freqData.length;
      } else {
        // Sin audio: latido suave para que el núcleo se sienta "vivo".
        uniforms.uAudio.value = 6 + Math.sin(uniforms.uTime.value * 1.5) * 4;
      }

      dynamicOrb.rotation.y += 0.005;
      dynamicOrb.rotation.x += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    // Responsividad: ventana + contenedor
    const handleResize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    // ── CLEANUP ESTRICTO ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      scene.remove(dynamicOrb);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      materialRef.current = null;
      freqData = null;
    };
    // Recolores/wireframe se actualizan en el efecto C sin reconstruir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── EFECTO B: audio (Oráculo o micrófono) — seguro y limpiable ─────
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let localAnalyser: AnalyserNode | null = null;
    // Solo cortamos los tracks del micrófono que ABRIMOS nosotros; el
    // `audioStream` del Oráculo es propiedad del que lo pasa.
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
      // Los navegadores exigen un gesto del usuario; si está suspendido,
      // se reanudará en la primera interacción sin romper nada.
      void audioContext.resume().catch(() => undefined);
    };

    if (audioStream) {
      attach(audioStream);
    } else if (enableMic && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          ownedMicStream = stream;
          attach(stream);
        })
        .catch(() => {
          // Permiso denegado o sin micrófono: seguimos sin audio (uAudio=0).
        });
    }

    return () => {
      cancelled = true;
      if (analyserRef.current === localAnalyser) analyserRef.current = null;
      try {
        source?.disconnect();
        localAnalyser?.disconnect();
      } catch {
        /* noop */
      }
      ownedMicStream?.getTracks().forEach((t) => t.stop());
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, [audioStream, enableMic]);

  // ── EFECTO C: actualizar colores / wireframe en vivo ───────────────
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    (material.uniforms.uColorBase.value as THREE.Color).set(baseColor);
    (material.uniforms.uColorActive.value as THREE.Color).set(activeColor);
    material.wireframe = wireframe;
  }, [baseColor, activeColor, wireframe]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 240, overflow: 'hidden' }}
    />
  );
}
