import { describe, expect, it } from 'vitest';
import { buildRedViva } from '@/features/redviva/services/redViva';
import { resumenRed, textoEstado } from '@/features/redviva/services/redViva';
import { textoLecturaOmicron } from './omicronLectura';

describe('textoLecturaOmicron — Ómicrom lee la red con textos reales', () => {
  it('sin nodo enfocado, lee el resumen global de la red (resumenRed)', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 80 }],
    });
    // Debe COINCIDIR con resumenRed, no un string inventado.
    expect(textoLecturaOmicron(model, null)).toBe(resumenRed(model));
  });

  it('con un nodo enfocado, lee la línea concreta de ese nodo (textoEstado)', () => {
    const model = buildRedViva({
      skillsDetail: [{ name: 'Excel', pct: 80 }],
    });
    const nodo = model.nodos[0];
    expect(textoLecturaOmicron(model, nodo)).toBe(textoEstado(nodo));
  });

  it('en una red vacía, el resumen invita a subir el CV (sin inventar números)', () => {
    const model = buildRedViva({ skillsDetail: [], skills: [] });
    expect(textoLecturaOmicron(model, null)).toBe(resumenRed(model));
    expect(textoLecturaOmicron(model, null)).toMatch(/CV/i);
  });
});
