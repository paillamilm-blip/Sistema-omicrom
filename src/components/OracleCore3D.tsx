// src/components/OracleCore3D.tsx
// ═══════════════════════════════════════════════════════════════════════
// 🔮 NÚCLEO 3D DEL ORÁCULO — Red neuronal WebGL pura
// Tecnología oscura premium, no es juego, es herramienta de vida
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { useGemeloProfile } from '../hooks/useGemeloProfile';
import { useApp } from '../store/AppContext';
import { useRealtime } from '../store/RealtimeContext';

interface Node3D {
  id: string;
  label: string;
  value: string | number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
}

export function OracleCore3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { profile } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const rep = profile.rep;
  const tokens = sb?.token_balance ?? 2480;
  const experiencia = profile.axes.execution ?? 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = w / 2;
    const centerY = h / 2.2;

    // Nodos 3D en espacio
    const nodes: Node3D[] = [
      // Orbe central (REP)
      { id: 'rep', label: String(rep), value: 'REPUTACIÓN', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, color: '#5cc8ff', size: 100 },
      
      // Nodos orbitales nivel 1 (cerca)
      { id: 'n1', label: 'N1', value: 'NODO', x: 0, y: -180, z: 50, vx: 0, vy: 0, vz: 0, color: '#5cc8ff', size: 16 },
      { id: 'tokens', label: String(tokens), value: 'TOKENS', x: -200, y: 0, z: 30, vx: 0, vy: 0, vz: 0, color: '#ffd27a', size: 20 },
      { id: 'exp', label: String(experiencia), value: 'EXPERIENCIA', x: 200, y: 0, z: 30, vx: 0, vy: 0, vz: 0, color: '#4ade80', size: 20 },
      { id: 'g3', label: 'G3', value: '', x: 0, y: 180, z: 50, vx: 0, vy: 0, vz: 0, color: '#a78bfa', size: 16 },
      
      // Nodos orbitales nivel 2 (módulos)
      { id: 'ejecuta', label: 'Ejecuta', value: 'EMPLEOS', x: 160, y: -120, z: -20, vx: 0, vy: 0, vz: 0, color: '#ff9500', size: 14 },
      { id: 'aprende', label: 'Aprende', value: 'ACADEMIA', x: -160, y: -120, z: -20, vx: 0, vy: 0, vz: 0, color: '#ff5252', size: 14 },
      { id: 'capitaliza', label: 'Capitaliza', value: 'BÓVEDA', x: 160, y: 120, z: -20, vx: 0, vy: 0, vz: 0, color: '#5cc8ff', size: 14 },
      { id: 'gobierna', label: 'Gobierna', value: 'GOBERNANZA', x: -160, y: 120, z: -20, vx: 0, vy: 0, vz: 0, color: '#a78bfa', size: 14 },
    ];

    // Partículas de fondo (estrellas profundas)
    const particles: { x: number; y: number; z: number; opacity: number }[] = [];
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: (Math.random() - 0.5) * w * 2,
        y: (Math.random() - 0.5) * h * 2,
        z: Math.random() * 500 - 250,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    let animFrame: number;
    let time = 0;

    const project3D = (x: number, y: number, z: number, rotX: number, rotY: number) => {
      // Rotación Y (horizontal)
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const xRot = x * cosY - z * sinY;
      const zRot = x * sinY + z * cosY;

      // Rotación X (vertical)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const yRot = y * cosX - zRot * sinX;
      const zFinal = y * sinX + zRot * cosX;

      // Proyección perspectiva
      const perspective = 800;
      const scale = perspective / (perspective + zFinal);
      
      return {
        x: centerX + xRot * scale,
        y: centerY + yRot * scale,
        scale,
        z: zFinal,
      };
    };

    const render = () => {
      time += 0.01;

      // Fondo negro absoluto
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Partículas de fondo (profundidad oscura)
      particles.forEach(p => {
        const proj = project3D(p.x, p.y, p.z, rotation.x, rotation.y);
        if (proj.z < 0) return; // Detrás de la cámara
        
        ctx.fillStyle = `rgba(92, 200, 255, ${p.opacity * proj.scale * 0.3})`;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 0.8 * proj.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ordenar nodos por Z (profundidad)
      const sortedNodes = [...nodes].sort((a, b) => {
        const pa = project3D(a.x, a.y, a.z, rotation.x, rotation.y);
        const pb = project3D(b.x, b.y, b.z, rotation.x, rotation.y);
        return pa.z - pb.z;
      });

      // Dibujar líneas de conexión (red neuronal)
      ctx.strokeStyle = 'rgba(92, 200, 255, 0.15)';
      ctx.lineWidth = 1;
      sortedNodes.forEach((node, i) => {
        if (node.id === 'rep') return; // Centro no conecta a sí mismo
        const start = project3D(node.x, node.y, node.z, rotation.x, rotation.y);
        const end = project3D(0, 0, 0, rotation.x, rotation.y);
        
        if (start.z > 0 && end.z > 0) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      });

      // Dibujar nodos
      sortedNodes.forEach(node => {
        const proj = project3D(node.x, node.y, node.z, rotation.x, rotation.y);
        if (proj.z < 0) return;

        const size = node.size * proj.scale;
        
        // Orbe central (especial)
        if (node.id === 'rep') {
          // Glow exterior
          const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size);
          gradient.addColorStop(0, 'rgba(180, 220, 255, 0.4)');
          gradient.addColorStop(0.3, 'rgba(92, 200, 255, 0.3)');
          gradient.addColorStop(0.7, 'rgba(30, 80, 140, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Esfera central
          const coreGradient = ctx.createRadialGradient(
            proj.x - size * 0.3,
            proj.y - size * 0.3,
            0,
            proj.x,
            proj.y,
            size
          );
          coreGradient.addColorStop(0, 'rgba(220, 240, 255, 1)');
          coreGradient.addColorStop(0.4, 'rgba(92, 200, 255, 0.9)');
          coreGradient.addColorStop(1, 'rgba(30, 80, 140, 1)');
          
          ctx.fillStyle = coreGradient;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
          ctx.fill();

          // REP número
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${size * 0.7}px -apple-system, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(rep), proj.x, proj.y - size * 0.05);

          // Label "REPUTACIÓN"
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.font = `600 ${size * 0.12}px monospace`;
          ctx.fillText('REPUTACIÓN', proj.x, proj.y + size * 0.35);
        } 
        // Nodos orbitales
        else {
          // Glow
          ctx.shadowBlur = 20 * proj.scale;
          ctx.shadowColor = node.color;
          
          // Círculo nodo
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2 * proj.scale;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = node.color;
          ctx.font = `600 ${size * 1.1}px -apple-system, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, proj.x, proj.y);

          // Sublabel
          if (node.value) {
            ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
            ctx.font = `500 ${size * 0.5}px monospace`;
            ctx.fillText(node.value, proj.x, proj.y + size * 1.8);
          }
        }
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    // Rotación automática sutil
    const autoRotate = setInterval(() => {
      if (!isDragging.current) {
        setRotation(r => ({ x: r.x, y: r.y + 0.002 }));
      }
    }, 50);

    return () => {
      cancelAnimationFrame(animFrame);
      clearInterval(autoRotate);
    };
  }, [rep, tokens, experiencia, rotation]);

  // Interacción táctil/mouse para rotar
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setRotation(r => ({
      x: r.x + dy * 0.005,
      y: r.y + dx * 0.005,
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
        cursor: isDragging.current ? 'grabbing' : 'grab',
      }}
    />
  );
}
