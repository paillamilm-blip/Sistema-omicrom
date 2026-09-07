// features/redviva/services/gapEngine.test.ts
// El motor de brechas tiene que decir la VERDAD o no decir nada.

import { describe, it, expect } from 'vitest';
import {
  normalizeSkill,
  skillMatches,
  parseRequiredSkills,
  payLabelOf,
  payValueOf,
  analyzeJob,
  rankOpportunities,
  bestMove,
  marketGaps,
  type RealJob,
} from './gapEngine';

// ── Empleos de prueba con la forma REAL de job_postings ────────────────
const jobIndustrial: RealJob = {
  id: 'j1',
  title: 'Analista de Operaciones',
  required_skills: ['Excel', 'SAP', 'Lean Manufacturing'],
  salary_range: '$850.000',
  status: 'OPEN',
};

const jobUnPaso: RealJob = {
  id: 'j2',
  title: 'Jefe de Planta',
  required_skills: ['SAP', 'Lean Manufacturing'],
  salary_range: '$1.400.000',
  status: 'OPEN',
};

const jobCaro: RealJob = {
  id: 'j3',
  title: 'Gerente de Operaciones',
  required_skills: ['SAP', 'Presupuestos', 'Liderazgo'],
  budget_usd: 3000,
  status: 'OPEN',
};

describe('normalizeSkill', () => {
  it('quita acentos, mayúsculas y espacios de sobra', () => {
    expect(normalizeSkill('  Automatización  ')).toBe('automatizacion');
    expect(normalizeSkill('Diseño   Industrial')).toBe('diseno industrial');
  });

  it('no explota con valores vacíos', () => {
    expect(normalizeSkill('')).toBe('');
    expect(normalizeSkill(undefined as unknown as string)).toBe('');
  });
});

describe('skillMatches', () => {
  it('reconoce la misma habilidad escrita distinto', () => {
    expect(skillMatches('excel', 'Excel')).toBe(true);
    expect(skillMatches('Automatizacion', 'automatización')).toBe(true);
  });

  it('acepta inclusión parcial cuando el término es largo', () => {
    expect(skillMatches('react', 'React Native')).toBe(true);
  });

  it('NO matchea por fragmentos cortos (anti falso positivo)', () => {
    expect(skillMatches('r', 'React')).toBe(false);
    expect(skillMatches('sap', 'Presupuestos')).toBe(false);
  });
});

describe('parseRequiredSkills', () => {
  it('lee un array real', () => {
    expect(parseRequiredSkills({ required_skills: ['Excel', 'SAP'] })).toEqual(['Excel', 'SAP']);
  });

  it('lee un string JSON (como puede llegar el jsonb)', () => {
    expect(parseRequiredSkills({ required_skills: '["Excel","SAP"]' })).toEqual(['Excel', 'SAP']);
  });

  it('lee una lista separada por comas', () => {
    expect(parseRequiredSkills({ required_skills: 'excel, sap , autocad' })).toEqual([
      'excel',
      'sap',
      'autocad',
    ]);
  });

  it('devuelve [] y no lanza cuando no hay dato', () => {
    expect(parseRequiredSkills({ required_skills: null })).toEqual([]);
    expect(parseRequiredSkills({ required_skills: undefined })).toEqual([]);
    expect(parseRequiredSkills({ required_skills: '{roto' })).toEqual(['{roto']);
  });
});

describe('pago', () => {
  it('muestra el texto real de la fuente sin reformatearlo', () => {
    expect(payLabelOf(jobIndustrial)).toBe('$850.000');
  });

  it('cae a budget_usd cuando no hay salary_range', () => {
    expect(payLabelOf(jobCaro)).toBe('3.000 tokens');
  });

  it('devuelve null si el empleo no informa pago (no inventa un rango)', () => {
    expect(payLabelOf({ id: 'x', title: 'X' })).toBeNull();
  });

  it('ordena por el número más grande del rango', () => {
    expect(payValueOf({ id: 'x', title: 'X', salary_range: '3.200–4.800 Ω/mes' })).toBe(4800);
    expect(payValueOf(jobIndustrial)).toBe(850000);
  });
});

describe('analyzeJob', () => {
  it('separa lo que tengo de lo que me falta, con NOMBRES', () => {
    const gap = analyzeJob(jobIndustrial, ['Excel', 'Lean Manufacturing']);
    expect(gap.have).toEqual(['Excel', 'Lean Manufacturing']);
    expect(gap.missing).toEqual(['SAP']);
    expect(gap.matchPct).toBe(67);
  });

  it('con todo cumplido, no falta nada', () => {
    const gap = analyzeJob(jobUnPaso, ['SAP', 'Lean Manufacturing']);
    expect(gap.missing).toEqual([]);
    expect(gap.matchPct).toBe(100);
  });
});

describe('rankOpportunities', () => {
  it('ordena primero lo más cercano y después lo que paga más', () => {
    const ranked = rankOpportunities([jobCaro, jobIndustrial, jobUnPaso], ['Lean Manufacturing']);
    // jobUnPaso: falta 1 (SAP) → primero
    expect(ranked[0].job.id).toBe('j2');
    expect(ranked[0].missing).toEqual(['SAP']);
  });

  it('descarta empleos que no declaran qué piden', () => {
    const sinSkills: RealJob = { id: 'j9', title: 'Vago', required_skills: [], status: 'OPEN' };
    expect(rankOpportunities([sinSkills], ['Excel'])).toEqual([]);
  });

  it('descarta empleos que no están abiertos', () => {
    const cerrado: RealJob = { ...jobUnPaso, id: 'j8', status: 'COMPLETED' };
    expect(rankOpportunities([cerrado], ['Lean Manufacturing'])).toEqual([]);
  });
});

describe('bestMove — la jugada', () => {
  it('elige la habilidad que deja un empleo COMPLETO y prefiere la que paga más', () => {
    const jugada = bestMove([jobIndustrial, jobUnPaso, jobCaro], ['Lean Manufacturing', 'Excel']);
    expect(jugada).not.toBeNull();
    // SAP es lo único que falta en j2 ($1.400.000) y en j1 ($850.000) → gana SAP
    expect(normalizeSkill(jugada!.skill)).toBe('sap');
    expect(jugada!.isOneStep).toBe(true);
    expect(jugada!.bestJob.job.id).toBe('j2'); // el que paga más
  });

  it('si nada deja un empleo completo, elige lo más pedido por el mercado', () => {
    const jugada = bestMove([jobIndustrial, jobCaro], []);
    expect(jugada).not.toBeNull();
    expect(jugada!.isOneStep).toBe(false);
    expect(normalizeSkill(jugada!.skill)).toBe('sap'); // aparece en los dos
  });

  it('devuelve null cuando no hay nada honesto que decir', () => {
    expect(bestMove([], ['Excel'])).toBeNull();
    // El usuario ya cumple todo lo pedido → no hay jugada
    expect(bestMove([jobUnPaso], ['SAP', 'Lean Manufacturing'])).toBeNull();
  });
});

describe('marketGaps — reemplazo honesto de getGapSkills', () => {
  it('NUNCA le sugiere a un ingeniero industrial que le falta "3d" o "devops"', () => {
    // Éste es el bug que este motor existe para matar: getGapSkills() de
    // matcher.ts devolvía un pool fijo ['typescript','testing','architecture',
    // '3d','node','python','design','product','devops'] sin mirar el mercado.
    const gaps = marketGaps([jobIndustrial, jobUnPaso, jobCaro], ['Excel']);
    const nombres = gaps.map((g) => normalizeSkill(g.skill));
    expect(nombres).not.toContain('3d');
    expect(nombres).not.toContain('devops');
    expect(nombres).not.toContain('typescript');
    // Sí contiene lo que los empleos reales piden de verdad:
    expect(nombres).toContain('sap');
  });

  it('ordena por demanda real del mercado', () => {
    const gaps = marketGaps([jobIndustrial, jobUnPaso, jobCaro], []);
    expect(normalizeSkill(gaps[0].skill)).toBe('sap'); // pedida en los 3
    expect(gaps[0].jobs).toBe(3);
  });

  it('sin empleos publicados devuelve vacío en vez de rellenar', () => {
    expect(marketGaps([], ['Excel'])).toEqual([]);
  });
});
