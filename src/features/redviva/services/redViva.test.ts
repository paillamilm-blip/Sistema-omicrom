// features/redviva/services/redViva.test.ts
// La regla que este test protege: SÓLIDO significa PROBADO. Nunca se deduce de un
// porcentaje. Si esto se rompe, la Red Viva miente y el sello "conocimiento
// verificable, no declarado" queda traicionado.

import { describe, it, expect } from 'vitest';
import {
  buildRedViva,
  hash01,
  resumenRed,
  textoEstado,
  type SkillProof,
} from './redViva';
import type { RealJob } from './gapEngine';

const skillsDetail = [
  { name: 'Excel', pct: 95 },        // afirmación altísima, sin prueba
  { name: 'SAP', pct: 40 },
  { name: 'Lean Manufacturing', pct: 70 },
];

const jobs: RealJob[] = [
  {
    id: 'j1',
    title: 'Analista de Operaciones',
    required_skills: ['Excel', 'SAP'],
    salary_range: '$850.000',
    status: 'OPEN',
  },
  {
    id: 'j2',
    title: 'Jefe de Planta',
    required_skills: ['SAP', 'Lean Manufacturing', 'Presupuestos'],
    salary_range: '$1.400.000',
    status: 'OPEN',
  },
];

describe('REGLA DE INTEGRIDAD — sólido = probado, jamás deducido', () => {
  it('un pct de 95 SIN prueba se dibuja HUECO, no sólido', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(excel.estado).toBe('hueco');
    expect(excel.provenScore).toBeNull();
    expect(excel.declaredPct).toBe(95);
    expect(excel.anillo).toBe(1); // frontera
  });

  it('una habilidad con prueba registrada va al núcleo y es sólida', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'excel', skill_label: 'Excel', best_score: 88, tokens_earned: 366 },
    ];
    const model = buildRedViva({ skillsDetail, jobs, proofs });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(excel.estado).toBe('solido');
    expect(excel.provenScore).toBe(88);
    expect(excel.tokensEarned).toBe(366);
    expect(excel.anillo).toBe(0); // núcleo
  });

  it('best_score null significa "probada sin puntaje", NO se rellena con un número', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'excel', skill_label: 'Excel', best_score: null },
    ];
    const model = buildRedViva({ skillsDetail, jobs, proofs });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(excel.estado).toBe('solido');
    expect(excel.provenScore).toBeNull();
    expect(textoEstado(excel)).toContain('No quedó registrado');
  });

  it('marca latiendo solo cuando hay una prueba en curso', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [], enCurso: ['sap'] });
    expect(model.nodos.find((n) => n.id === 'sap')!.estado).toBe('latiendo');
    expect(model.nodos.find((n) => n.id === 'excel')!.estado).toBe('hueco');
  });
});

describe('totales — el 20/80 hecho número', () => {
  it('cuenta probadas sobre declaradas', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'excel', skill_label: 'Excel', best_score: 90, tokens_earned: 400 },
    ];
    const model = buildRedViva({ skillsDetail, jobs, proofs });
    expect(model.totales.declaradas).toBe(3);
    expect(model.totales.probadas).toBe(1);
    expect(model.totales.pctProbado).toBe(33);
    expect(model.totales.tokensGanados).toBe(400);
  });

  it('una habilidad probada que no estaba en el CV también cuenta', () => {
    const proofs: SkillProof[] = [
      { skill_key: 'autocad', skill_label: 'AutoCAD', best_score: 75 },
    ];
    const model = buildRedViva({ skillsDetail, jobs, proofs });
    expect(model.totales.declaradas).toBe(4); // 3 del CV + 1 probada aparte
    const autocad = model.nodos.find((n) => n.id === 'autocad')!;
    expect(autocad.declaredPct).toBeNull(); // no la afirmó el CV
    expect(autocad.estado).toBe('solido');
  });
});

describe('vacío y respaldos', () => {
  it('sin habilidades, la red se declara vacía e invita a subir el CV', () => {
    const model = buildRedViva({});
    expect(model.vacia).toBe(true);
    expect(model.nodos).toEqual([]);
    expect(resumenRed(model)).toContain('Subí tu CV');
  });

  it('sin habilidades sigue vacía aunque haya mercado cargado', () => {
    const model = buildRedViva({ jobs, proofs: [] });
    expect(model.vacia).toBe(true);
    expect(model.totales.declaradas).toBe(0);
  });

  it('sin skills_detail usa skills[] y NO inventa un pct', () => {
    const model = buildRedViva({ skills: ['Excel', 'SAP'], jobs });
    const mias = model.nodos.filter((n) => n.anillo !== 2);
    expect(mias).toHaveLength(2);
    expect(mias.every((n) => n.declaredPct === 0)).toBe(true);
  });
});

describe('AUSENTES — la pieza que el mercado paga y no tenés', () => {
  it('crea nodo fantasma para lo que falta, sin contarlo como tuyo', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const presupuestos = model.nodos.find((n) => n.id === 'presupuestos');
    expect(presupuestos).toBeDefined();
    expect(presupuestos!.estado).toBe('ausente');
    expect(presupuestos!.anillo).toBe(2);
    expect(presupuestos!.declaredPct).toBeNull(); // no es una afirmación tuya
    expect(presupuestos!.provenScore).toBeNull();
    // Y NO ensucia el 20/80: las ausentes no son habilidades tuyas.
    expect(model.totales.declaradas).toBe(3);
    expect(model.totales.ausentes).toBe(1);
  });

  it('el nodo ausente vive más afuera que la frontera declarada', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const radio = (id: string) => {
      const n = model.nodos.find((x) => x.id === id)!;
      return Math.hypot(n.x, n.y);
    };
    expect(radio('presupuestos')).toBeGreaterThan(radio('excel'));
  });

  it('explica en lenguaje claro por qué te conviene', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const presupuestos = model.nodos.find((n) => n.id === 'presupuestos')!;
    expect(textoEstado(presupuestos)).toBe(
      'No la tenés. Es lo único que te falta para 1 empleo.',
    );
  });

  it('la jugada recomendada SIEMPRE está dibujada en pantalla', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    expect(model.jugada).not.toBeNull();
    const dibujada = model.nodos.some(
      (n) => n.id === model.jugada!.skill.toLowerCase(),
    );
    expect(dibujada).toBe(true);
  });

  it('sin empleos publicados no hay nodos ausentes (no se inventa mercado)', () => {
    const model = buildRedViva({ skillsDetail, jobs: [], proofs: [] });
    expect(model.nodos.every((n) => n.estado !== 'ausente')).toBe(true);
    expect(model.totales.ausentes).toBe(0);
  });
});

describe('layout — estable y sin reordenar al crecer', () => {
  it('la misma habilidad cae siempre en la misma posición', () => {
    const a = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const b = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const excelA = a.nodos.find((n) => n.id === 'excel')!;
    const excelB = b.nodos.find((n) => n.id === 'excel')!;
    expect(excelA.x).toBeCloseTo(excelB.x, 10);
    expect(excelA.y).toBeCloseTo(excelB.y, 10);
  });

  it('hash01 es determinista y acotado a 0..1', () => {
    expect(hash01('Excel')).toBe(hash01('excel'));
    const v = hash01('Lean Manufacturing');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('dispersa identidades comunes sin perder estabilidad', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Python', pct: 70 }, { name: 'TypeScript', pct: 70 }],
      jobs: [],
    });
    const python = model.nodos.find((n) => n.id === 'python')!;
    const typescript = model.nodos.find((n) => n.id === 'typescript')!;
    expect(Math.abs(python.angulo - typescript.angulo)).toBeGreaterThan(0.1);
  });

  it('agregar habilidades no cambia el ángulo de una habilidad existente', () => {
    const antes = buildRedViva({ skillsDetail: [{ name: 'Excel', pct: 95 }], jobs: [] });
    const despues = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 95 }, { name: 'SAP', pct: 60 }, { name: 'Python', pct: 70 }],
      jobs: [],
    });
    expect(despues.nodos.find((n) => n.id === 'excel')!.angulo)
      .toBeCloseTo(antes.nodos.find((n) => n.id === 'excel')!.angulo, 12);
  });

  it('pasar de hueco a sólido conserva el ángulo y solo reduce el radio', () => {
    const antes = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const despues = buildRedViva({
      skillsDetail,
      jobs,
      proofs: [{ skill_key: 'excel', skill_label: 'Excel', best_score: 90 }],
    });
    const excelAntes = antes.nodos.find((n) => n.id === 'excel')!;
    const excelDespues = despues.nodos.find((n) => n.id === 'excel')!;
    expect(excelDespues.angulo).toBeCloseTo(excelAntes.angulo, 12);
    expect(Math.hypot(excelDespues.x, excelDespues.y))
      .toBeLessThan(Math.hypot(excelAntes.x, excelAntes.y));
  });

  it('probar una habilidad la MUEVE de la frontera al núcleo', () => {
    const antes = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const despues = buildRedViva({
      skillsDetail,
      jobs,
      proofs: [{ skill_key: 'excel', skill_label: 'Excel', best_score: 90 }],
    });
    const radioAntes = Math.hypot(
      antes.nodos.find((n) => n.id === 'excel')!.x,
      antes.nodos.find((n) => n.id === 'excel')!.y,
    );
    const radioDespues = Math.hypot(
      despues.nodos.find((n) => n.id === 'excel')!.x,
      despues.nodos.find((n) => n.id === 'excel')!.y,
    );
    expect(radioDespues).toBeLessThan(radioAntes);
  });

  it('todos los nodos caen dentro del círculo unitario', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    for (const n of model.nodos) {
      expect(Math.hypot(n.x, n.y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('oportunidades y puentes', () => {
  it('conecta la habilidad que falta con la oportunidad que desbloquea', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const puentes = model.aristas.filter((a) => a.tipo === 'puente');
    expect(puentes.length).toBeGreaterThan(0);
    expect(puentes.every((p) => p.punteada)).toBe(true); // aún no cruzado
  });

  it('relaciona habilidades que un mismo empleo pide juntas', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const mercado = model.aristas.filter((a) => a.tipo === 'mercado');
    const par = mercado.find(
      (a) =>
        (a.from === 'excel' && a.to === 'sap') || (a.from === 'sap' && a.to === 'excel'),
    );
    expect(par).toBeDefined(); // j1 pide Excel y SAP juntas
  });

  it('sin empleos publicados no hay oportunidades ni jugada inventada', () => {
    const model = buildRedViva({ skillsDetail, jobs: [], proofs: [] });
    expect(model.oportunidades).toEqual([]);
    expect(model.jugada).toBeNull();
    expect(model.brechas).toEqual([]);
  });

  it('la jugada apunta a lo que el mercado pide y no tengo', () => {
    // El usuario tiene Excel y SAP probados; falta "Presupuestos" para j2.
    const model = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 90 }, { name: 'SAP', pct: 80 }, { name: 'Lean Manufacturing', pct: 70 }],
      jobs,
      proofs: [],
    });
    expect(model.jugada).not.toBeNull();
    expect(model.jugada!.skill.toLowerCase()).toBe('presupuestos');
    expect(model.jugada!.isOneStep).toBe(true);
    expect(model.jugada!.bestJob.job.id).toBe('j2');
  });
});

describe('textos — cero jerga, cada número con contexto', () => {
  it('el resumen dice la verdad incómoda cuando no hay nada probado', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    expect(resumenRed(model)).toBe(
      'Declaraste 3 habilidades y todavía no probaste ninguna. Probá una y empieza a valer.',
    );
  });

  it('el resumen parcial evita jerga visual como “hueca”', () => {
    const model = buildRedViva({
      skillsDetail,
      jobs,
      proofs: [{ skill_key: 'excel', skill_label: 'Excel', best_score: 88 }],
    });
    expect(resumenRed(model)).toBe(
      'Probaste 1 de 3 habilidades. Las 2 restantes todavía no tienen una prueba.',
    );
  });

  it('el resumen completo habla de habilidades registradas, aunque una prueba no venga del CV', () => {
    const model = buildRedViva({
      proofs: [{ skill_key: 'autocad', skill_label: 'AutoCAD', best_score: 90 }],
      jobs: [],
    });
    expect(resumenRed(model)).toBe(
      'Probaste la habilidad registrada. Tiene una prueba registrada.',
    );
  });

  it('un nodo hueco muestra la escala completa, no un número pelado', () => {
    const model = buildRedViva({ skillsDetail, jobs, proofs: [] });
    const excel = model.nodos.find((n) => n.id === 'excel')!;
    expect(textoEstado(excel)).toBe('Tu CV dice 95/100. Nadie lo comprobó todavía.');
  });

  it('un nodo probado muestra su puntaje real sobre 100', () => {
    const model = buildRedViva({
      skillsDetail,
      jobs,
      proofs: [{ skill_key: 'sap', skill_label: 'SAP', best_score: 82 }],
    });
    const sap = model.nodos.find((n) => n.id === 'sap')!;
    expect(textoEstado(sap)).toBe('Probada con 82/100.');
  });
});
