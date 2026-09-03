// src/features/omicron/utils/typewriter.test.ts
// Pruebas del helper PURO del typewriter (Respuesta Viva Inc 2). Ejercitan el
// troceo REAL palabra por palabra: fallarían si wordPrefixes fuera revertido a
// devolver [text] (un solo paso), porque comprueban prefijos intermedios, la
// reconstrucción EXACTA del original y la preservación de whitespace/saltos de
// línea. No renderizan componentes ni tocan window.matchMedia / framer /
// Supabase — el módulo es puro por diseño.

import { describe, it, expect } from 'vitest';
import { splitIntoWords, wordPrefixes } from './typewriter';

describe('splitIntoWords — troceo que preserva el whitespace', () => {
  it('string vacío → []', () => {
    expect(splitIntoWords('')).toEqual([]);
  });

  it('una sola palabra → un token', () => {
    expect(splitIntoWords('Hola')).toEqual(['Hola']);
  });

  it('palabras separadas por un espacio alternan palabra / espacio', () => {
    expect(splitIntoWords('Hola, mundo')).toEqual(['Hola,', ' ', 'mundo']);
  });

  it('conserva espacios múltiples como un solo token de whitespace', () => {
    expect(splitIntoWords('a  b')).toEqual(['a', '  ', 'b']);
  });

  it('conserva saltos de línea y espacios de borde', () => {
    expect(splitIntoWords('  a\n b ')).toEqual(['  ', 'a', '\n ', 'b', ' ']);
  });

  it('la unión de los tokens reconstruye el original EXACTO', () => {
    const samples = ['', 'Hola', 'Hola, mundo', 'a  b', '  a\n b ', 'línea1\nlínea2\n\nfin'];
    for (const s of samples) {
      expect(splitIntoWords(s).join('')).toBe(s);
    }
  });
});

describe('wordPrefixes — prefijos acumulados, palabra por palabra', () => {
  it('string vacío → []', () => {
    expect(wordPrefixes('')).toEqual([]);
  });

  it('una sola palabra → un único prefijo igual al input', () => {
    expect(wordPrefixes('Hola')).toEqual(['Hola']);
  });

  it('varias palabras → prefijos acumulados; el último es el texto exacto', () => {
    expect(wordPrefixes('Hola, mundo')).toEqual(['Hola,', 'Hola, mundo']);
    expect(wordPrefixes('a b c')).toEqual(['a', 'a b', 'a b c']);
  });

  it('un espacio inicial viaja con la primera palabra (sin paso vacío)', () => {
    expect(wordPrefixes(' a')).toEqual([' a']);
  });

  it('preserva espacios múltiples entre palabras', () => {
    expect(wordPrefixes('a  b')).toEqual(['a', 'a  b']);
  });

  it('un texto que termina en whitespace igual reconstruye el original', () => {
    expect(wordPrefixes('a ')).toEqual(['a', 'a ']);
  });

  it('preserva saltos de línea entre palabras', () => {
    expect(wordPrefixes('a\nb')).toEqual(['a', 'a\nb']);
  });

  it('un texto solo de whitespace produce un único prefijo igual al input', () => {
    expect(wordPrefixes('   ')).toEqual(['   ']);
  });

  it('INVARIANTE: el último prefijo es SIEMPRE igual al input', () => {
    const samples = [
      'Hola',
      'Hola, mundo',
      'Sube tu CV y te activo el Gemelo completo.',
      'línea1\nlínea2\n\nfin',
      '  con bordes  ',
    ];
    for (const s of samples) {
      const prefixes = wordPrefixes(s);
      expect(prefixes[prefixes.length - 1]).toBe(s);
    }
  });

  it('INVARIANTE: cada prefijo es un inicio REAL del texto', () => {
    const text = 'Haz esto ahora: valida una skill.';
    for (const prefix of wordPrefixes(text)) {
      expect(text.startsWith(prefix)).toBe(true);
    }
  });

  it('revela MÁS de un paso para texto multi-palabra (no colapsa a [text])', () => {
    // Guarda contra una regresión a `return [text]`: un texto de N palabras
    // debe producir N prefijos crecientes.
    const prefixes = wordPrefixes('uno dos tres cuatro');
    expect(prefixes.length).toBe(4);
    expect(prefixes[0]).toBe('uno');
    expect(prefixes[3]).toBe('uno dos tres cuatro');
  });
});
