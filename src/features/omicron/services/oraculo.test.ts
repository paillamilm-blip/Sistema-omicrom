// lib/oraculo.test.ts
// Tests unitarios del motor de intención (interpret). Es la única función
// 100% pura del módulo: askTutor/askCoach llaman a Supabase y no se testean
// aquí (requieren mocking de red, fuera de alcance de un test unitario puro).
// Ejecutar: npm run test

import { describe, it, expect } from 'vitest';
import { interpret } from './oraculo';

describe('interpret — casos vacíos/inválidos', () => {
  it('string vacío → unknown', () => {
    expect(interpret('')).toEqual({ kind: 'unknown' });
  });

  it('solo espacios → unknown', () => {
    expect(interpret('   ')).toEqual({ kind: 'unknown' });
  });
});

describe('interpret — navegación', () => {
  it('detecta "academia" → tab academia', () => {
    expect(interpret('llevame a la academia')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });

  it('detecta "billetera" → tab wallet', () => {
    expect(interpret('abrí mi billetera')).toEqual({ kind: 'navigate', tab: 'wallet', label: 'Billetera' });
  });

  it('detecta "empleos" → tab empleos', () => {
    expect(interpret('quiero ver empleos')).toEqual({ kind: 'navigate', tab: 'empleos', label: 'Empleos' });
  });

  it('detecta "bóveda" (con tilde) → tab vault', () => {
    expect(interpret('llevame a la bóveda')).toEqual({ kind: 'navigate', tab: 'vault', label: 'Bóveda' });
  });

  it('detecta "gobernanza" → tab gobernanza', () => {
    expect(interpret('quiero votar en gobernanza')).toEqual({ kind: 'navigate', tab: 'gobernanza', label: 'Gobernanza' });
  });

  it('es case-insensitive', () => {
    expect(interpret('ACADEMIA')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });
});

// ── ÓRDENES NATURALES DE LA BARRA JARVIS (Matar el Escritorio, Inc 3) ──
// El fundador habla/escribe en lenguaje natural y la barra teletransporta al
// módulo REAL correcto (destinos verificados contra el código, sin inventar
// pantallas). Estas mapean a tabs existentes, ganando sobre las palabras
// genéricas. El spec falla si se revierten los grupos NAV_NATURAL.
describe('interpret — órdenes naturales (Jarvis)', () => {
  it('"quiero jugar" → Habilidades (maxskill hospeda los retos)', () => {
    expect(interpret('quiero jugar')).toEqual({ kind: 'navigate', tab: 'maxskill', label: 'Habilidades' });
  });

  it('"muéstrame un reto" → Habilidades (maxskill)', () => {
    expect(interpret('muéstrame un reto')).toEqual({ kind: 'navigate', tab: 'maxskill', label: 'Habilidades' });
  });

  it('"vender una idea" → Servicios (market)', () => {
    expect(interpret('vender una idea')).toEqual({ kind: 'navigate', tab: 'market', label: 'Servicios' });
  });

  it('"quiero monetizar mi servicio" → Servicios (market)', () => {
    expect(interpret('quiero monetizar mi servicio')).toEqual({ kind: 'navigate', tab: 'market', label: 'Servicios' });
  });

  it('"buscar trabajo freelance" → Servicios (market; freelance = vender tu servicio)', () => {
    expect(interpret('buscar trabajo freelance')).toEqual({ kind: 'navigate', tab: 'market', label: 'Servicios' });
  });

  it('"tengo un trabajo por proyecto" → Servicios (market)', () => {
    expect(interpret('tengo un trabajo por proyecto')).toEqual({ kind: 'navigate', tab: 'market', label: 'Servicios' });
  });

  it('"ver mi ranking" → Mensajes (RedSocialTab tiene la sección Ranking)', () => {
    expect(interpret('ver mi ranking')).toEqual({ kind: 'navigate', tab: 'chat', label: 'Mensajes' });
  });

  it('"cuál es mi posición en la tabla" → Mensajes (ranking)', () => {
    expect(interpret('cuál es mi posición en la tabla')).toEqual({ kind: 'navigate', tab: 'chat', label: 'Mensajes' });
  });

  it('regresión: "buscar empleo" (sin freelance) sigue yendo a Empleos', () => {
    expect(interpret('buscar empleo')).toEqual({ kind: 'navigate', tab: 'empleos', label: 'Empleos' });
  });
});

describe('interpret — convalidación', () => {
  it('"sube mi cv" → convalidate cv', () => {
    expect(interpret('sube mi cv')).toEqual({ kind: 'convalidate', item: 'cv' });
  });

  it('"agrega un título" → convalidate title', () => {
    expect(interpret('agrega un título')).toEqual({ kind: 'convalidate', item: 'title' });
  });

  it('"suma un año de experiencia" → convalidate year', () => {
    expect(interpret('suma un año de experiencia')).toEqual({ kind: 'convalidate', item: 'year' });
  });

  it('"carga un aporte a la bóveda" → convalidate vault', () => {
    expect(interpret('carga un aporte a la bóveda')).toEqual({ kind: 'convalidate', item: 'vault' });
  });

  it('verbo de convalidación sin objeto reconocible cae a unknown (no revienta)', () => {
    expect(interpret('convalida algo random sin sentido')).toEqual({ kind: 'unknown' });
  });
});

describe('interpret — coach', () => {
  it('"dame un consejo" → coach', () => {
    expect(interpret('dame un consejo')).toEqual({ kind: 'coach' });
  });

  it('"qué estudio ahora" → coach', () => {
    expect(interpret('qué estudio ahora')).toEqual({ kind: 'coach' });
  });

  it('"cómo mejoro mi reputación" → coach (trigger de coach precede a fact)', () => {
    expect(interpret('cómo mejoro mi reputación')).toEqual({ kind: 'coach' });
  });
});

describe('interpret — datos simples (fact)', () => {
  it('"cuánta reputación tengo" → fact reputacion', () => {
    expect(interpret('cuánta reputación tengo')).toEqual({ kind: 'fact', topic: 'reputacion' });
  });

  it('"cuántos tokens tengo" → fact tokens', () => {
    expect(interpret('cuántos tokens tengo')).toEqual({ kind: 'fact', topic: 'tokens' });
  });

  it('"cuántos puntos de experiencia tengo" → fact pe', () => {
    expect(interpret('cuántos puntos tengo')).toEqual({ kind: 'fact', topic: 'pe' });
  });

  it('"hola" → unknown (goes to AI brain)', () => {
    expect(interpret('hola')).toEqual({ kind: 'unknown' });
  });

  it('"qué puedo hacer" → fact ayuda', () => {
    expect(interpret('qué puedo hacer')).toEqual({ kind: 'fact', topic: 'ayuda' });
  });
});

describe('interpret — unknown', () => {
  it('frase sin ningún patrón reconocible → unknown', () => {
    expect(interpret('xkjhasdf 12341 zzz')).toEqual({ kind: 'unknown' });
  });
});
