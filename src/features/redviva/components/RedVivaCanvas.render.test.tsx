// features/redviva/components/RedVivaCanvas.render.test.tsx
// Test de RENDER del cableado del "encaje": shouldAnimateEncaje se testea como
// función pura aparte; acá verificamos que su resultado se ENCHUFA bien dentro
// de RedVivaCanvas —el memo que lee el ref del estado previo + el efecto que lo
// actualiza tras pintar— de modo que SOLO los nodos que transicionan a probado
// reproducen el micro-momento. El gancho observable es data-encaje en el grupo
// de forma animable (motion.g).
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildRedViva, type SkillDeclarada, type SkillProof } from '../services/redViva';
import { RedVivaCanvas } from './RedVivaCanvas';

afterEach(cleanup);

const SKILLS: SkillDeclarada[] = [
  { name: 'Excel', pct: 80 },
  { name: 'Python', pct: 70 },
];

/** Prueba registrada de una habilidad -> ese nodo queda 'solido'. */
function proofDe(nombre: string): SkillProof {
  return { skill_key: nombre, skill_label: nombre, best_score: 90 };
}

describe('RedVivaCanvas — cableado del encaje a nivel de render', () => {
  it('en el PRIMER render ningún nodo anima el encaje (aunque ya esté probado)', () => {
    const model = buildRedViva({ skillsDetail: SKILLS, proofs: [proofDe('Excel')], jobs: [] });
    const { container } = render(
      <RedVivaCanvas model={model} userColor="#7dd3fc" reputacion={60} varianteNodo="pieza" />,
    );
    // Todos los grupos animables arrancan en 'false': primer render, sin
    // estado previo -> shouldAnimateEncaje es false para todos.
    const flags = Array.from(container.querySelectorAll('[data-encaje]')).map((g) =>
      g.getAttribute('data-encaje'),
    );
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f === 'false')).toBe(true);
  });

  it('SOLO el nodo que pasa a probado anima; los demás no', () => {
    // Render 1: Excel y Python declaradas, ninguna probada (ambas 'hueco').
    const model1 = buildRedViva({ skillsDetail: SKILLS, proofs: [], jobs: [] });
    const { container, rerender } = render(
      <RedVivaCanvas model={model1} userColor="#7dd3fc" reputacion={60} varianteNodo="pieza" />,
    );
    // Tras el primer render el efecto guarda la foto de estados (hueco/hueco).

    // Render 2: ahora Excel tiene prueba -> transiciona a 'solido'. Python sigue hueco.
    const model2 = buildRedViva({ skillsDetail: SKILLS, proofs: [proofDe('Excel')], jobs: [] });
    rerender(
      <RedVivaCanvas model={model2} userColor="#7dd3fc" reputacion={60} varianteNodo="pieza" />,
    );

    const grupos = Array.from(container.querySelectorAll('[data-encaje]'));
    const animando = grupos.filter((g) => g.getAttribute('data-encaje') === 'true');
    // Exactamente UN nodo (Excel) reproduce el encaje.
    expect(animando).toHaveLength(1);
    // Y es el nodo que ahora es 'solido'.
    const estadoAnimado = animando[0].querySelector('[data-node-state]')?.getAttribute('data-node-state');
    expect(estadoAnimado).toBe('solido');
  });

  it('bajo transición a probado con reduced-motion NINGÚN nodo anima (respeta la preferencia)', () => {
    // Fuerza prefers-reduced-motion en jsdom antes de montar.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const model1 = buildRedViva({ skillsDetail: SKILLS, proofs: [], jobs: [] });
      const { container, rerender } = render(
        <RedVivaCanvas model={model1} userColor="#7dd3fc" reputacion={60} varianteNodo="pieza" />,
      );
      const model2 = buildRedViva({ skillsDetail: SKILLS, proofs: [proofDe('Excel')], jobs: [] });
      rerender(
        <RedVivaCanvas model={model2} userColor="#7dd3fc" reputacion={60} varianteNodo="pieza" />,
      );

      const flags = Array.from(container.querySelectorAll('[data-encaje]')).map((g) =>
        g.getAttribute('data-encaje'),
      );
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.every((f) => f === 'false')).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });
});
