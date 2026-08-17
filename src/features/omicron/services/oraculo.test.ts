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

  it('"hola" → fact ayuda', () => {
    expect(interpret('hola')).toEqual({ kind: 'fact', topic: 'ayuda' });
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
