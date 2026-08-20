// lib/cvAnalyzer.test.ts
// Tests unitarios del motor de análisis de CV (función pura, sin red/DB).
// Ejecutar:  npm run test

import { describe, it, expect } from 'vitest';
import { analyzeCV, DEMO_CV, SKILL_LABELS } from './cvAnalyzer';

describe('analyzeCV — detección de skills', () => {
  it('detecta React y TypeScript en un texto simple', () => {
    const p = analyzeCV('Desarrollador con experiencia en React y TypeScript');
    expect(p.skills).toContain('react');
    expect(p.skills).toContain('typescript');
  });

  it('detecta múltiples categorías de skills (frontend, backend, devops)', () => {
    const p = analyzeCV('Node.js, Docker, AWS, PostgreSQL y React en producción');
    expect(p.skills).toContain('node');
    expect(p.skills).toContain('devops');
    expect(p.skills).toContain('sql');
    expect(p.skills).toContain('react');
  });

  it('asigna defaults (frontend, javascript) si no detecta ninguna skill', () => {
    const p = analyzeCV('Persona sin ninguna palabra clave técnica reconocible');
    expect(p.skills).toEqual(['frontend', 'javascript']);
  });

  it('labels legibles corresponden 1 a 1 con los skills detectados', () => {
    const p = analyzeCV('Experto en React');
    const idx = p.skills.indexOf('react');
    expect(p.labels[idx]).toBe(SKILL_LABELS.react);
  });

  it('texto vacío o inválido no lanza excepción y devuelve defaults', () => {
    expect(() => analyzeCV('')).not.toThrow();
    const p = analyzeCV('');
    expect(p.skills.length).toBeGreaterThan(0);
  });
});

describe('analyzeCV — años de experiencia', () => {
  it('extrae años cuando el formato es "N años"', () => {
    expect(analyzeCV('Tengo 6 años de experiencia en desarrollo').years).toBe(6);
  });

  it('extrae años cuando el formato es "N+ years"', () => {
    expect(analyzeCV('10+ years of experience').years).toBe(10);
  });

  it('sin mención de años → 0', () => {
    expect(analyzeCV('Desarrollador React sin fecha mencionada').years).toBe(0);
  });

  it('cap de años en 30 (valor absurdo se recorta)', () => {
    expect(analyzeCV('99 años de experiencia').years).toBe(30);
  });
});

describe('analyzeCV — nivel de seniority', () => {
  // NOTA: analyzeCV tiene un paso posterior (7. ARQUITECTURA) que sobrescribe
  // seniorLevel/seniorLabel a 'estudiante' (nivel 1) cuando years < 1 Y
  // found.length < 3. Los inputs de este bloque incluyen años explícitos
  // y/o suficientes skills detectables para escapar ese override y así
  // testear realmente la detección de seniority del paso 3.

  it('detecta Lead/Arquitecto por palabra clave', () => {
    const p = analyzeCV('Tech Lead con 8 años liderando equipos de React y Node');
    expect(p.seniorLevel).toBe(5);
    expect(p.seniorLabel).toBe('Tech Lead / Arquitecto');
  });

  it('detecta Senior por palabra clave', () => {
    const p = analyzeCV('Desarrollador Senior con 6 años de experiencia sólida en React');
    expect(p.seniorLevel).toBe(4);
  });

  it('detecta Senior por años (>=5) sin la palabra "senior"', () => {
    const p = analyzeCV('Desarrollador con 7 años de experiencia en Java');
    expect(p.seniorLevel).toBe(4);
  });

  it('detecta Junior por palabra clave + pocos años', () => {
    const p = analyzeCV('Desarrollador Junior con 1 año de experiencia en React');
    expect(p.seniorLevel).toBe(1);
  });

  it('default es Mid cuando no hay señales claras pero sí experiencia y skills', () => {
    const p = analyzeCV('Desarrollador de software con 2 años de experiencia en React, Node y SQL');
    expect(p.seniorLevel).toBe(2);
    expect(p.seniorLabel).toBe('Desarrollador Mid');
  });
});

describe('analyzeCV — arquitectura del perfil (arch)', () => {
  it('detecta estudiante por palabra clave explícita', () => {
    const p = analyzeCV('Estudiante de ingeniería, cursando el último año');
    expect(p.arch).toBe('estudiante');
    expect(p.seniorLevel).toBe(1);
  });

  it('detecta estudiante por falta de experiencia y pocas skills', () => {
    const p = analyzeCV('Recién egresado sin experiencia previa');
    expect(p.arch).toBe('estudiante');
  });

  it('perfil senior con muchos años → arch lead o senior', () => {
    const p = analyzeCV('Tech Lead con 10 años liderando equipos de ingeniería');
    expect(['lead', 'senior']).toContain(p.arch);
  });

  it('estudiante tiene el fundamento acotado a máximo 60', () => {
    const p = analyzeCV('Estudiante de programación, cursando y aprendiendo React');
    expect(p.axes.fund).toBeLessThanOrEqual(60);
  });
});

describe('analyzeCV — creatividad', () => {
  it('perfil creativo (diseño, UX, motion) tiene creativity alta', () => {
    const p = analyzeCV('Diseñador UX/UI con experiencia en motion, animación, branding y 3D');
    expect(p.creativity).toBeGreaterThan(0.5);
  });

  it('perfil puramente backend tiene creativity baja', () => {
    const p = analyzeCV('Backend engineer, APIs REST, bases de datos SQL');
    expect(p.creativity).toBeLessThan(0.3);
  });

  it('creativity siempre está en el rango [0, 1]', () => {
    const p = analyzeCV('creativ diseñ design ux ui motion animaci brand arte innovaci 3d product');
    expect(p.creativity).toBeGreaterThanOrEqual(0);
    expect(p.creativity).toBeLessThanOrEqual(1);
  });
});

describe('analyzeCV — ejes del Gemelo Digital (rangos válidos)', () => {
  it('todos los ejes quedan dentro de sus rangos documentados', () => {
    const p = analyzeCV(DEMO_CV);
    expect(p.axes.exec).toBeGreaterThanOrEqual(20);
    expect(p.axes.exec).toBeLessThanOrEqual(96);
    expect(p.axes.qual).toBeGreaterThanOrEqual(20);
    expect(p.axes.qual).toBeLessThanOrEqual(95);
    expect(p.axes.trans).toBeGreaterThanOrEqual(8);
    expect(p.axes.trans).toBeLessThanOrEqual(92);
    expect(p.axes.fund).toBeGreaterThanOrEqual(20);
    expect(p.axes.fund).toBeLessThanOrEqual(97);
  });

  it('CV vacío también respeta los rangos (caso límite)', () => {
    const p = analyzeCV('');
    expect(p.axes.exec).toBeGreaterThanOrEqual(20);
    expect(p.axes.fund).toBeGreaterThanOrEqual(20);
  });

  it('DEMO_CV produce un perfil senior/lead con alta creatividad (smoke test)', () => {
    const p = analyzeCV(DEMO_CV);
    expect(p.seniorLevel).toBeGreaterThanOrEqual(4);
    expect(p.creativity).toBeGreaterThan(0.3);
    expect(p.skills).toContain('react');
  });
});

describe('analyzeCV — extracción de nombre', () => {
  it('extrae la primera línea como nombre si parece un nombre válido', () => {
    const p = analyzeCV('Juan Pérez\nDesarrollador Frontend con 5 años de experiencia');
    expect(p.name).toBe('Juan Pérez');
  });

  it('no extrae nombre si la primera línea es un título genérico de CV', () => {
    const p = analyzeCV('Curriculum Vitae\nDesarrollador Frontend');
    expect(p.name).toBe('');
  });

  it('no extrae nombre si la primera línea es muy larga', () => {
    const longLine = 'Esta es una primera línea demasiado larga para ser un nombre de persona real';
    const p = analyzeCV(`${longLine}\nDesarrollador`);
    expect(p.name).toBe('');
  });
});
