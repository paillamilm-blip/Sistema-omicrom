// features/redviva/services/examenSkill.test.ts
// Las validaciones tienen que ser ESPEJO de omicron_ensure_skill_node. Si acá se
// acepta algo que la base rechaza, el usuario ve un error después de esperar;
// si acá se rechaza algo que la base acepta, se pierde un examen válido.

import { describe, it, expect } from 'vitest';
import { normalizarTitulo, validarTitulo, TITULO_MAX, tomarExamenPendiente } from './examenSkill';

// sessionStorage mínimo para entornos que no lo traen. En jsdom ya existe y no se
// toca; así el test corre igual en el CI y fuera de él.
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
  });
}

const CLAVE = 'omicron_pending_exam';

describe('normalizarTitulo', () => {
  it('colapsa espacios y recorta, igual que el SQL', () => {
    expect(normalizarTitulo('  Derecho   Laboral  ')).toBe('Derecho Laboral');
    expect(normalizarTitulo('Lean\tManufacturing')).toBe('Lean Manufacturing');
  });

  it('no explota con vacíos', () => {
    expect(normalizarTitulo(null)).toBe('');
    expect(normalizarTitulo(undefined)).toBe('');
  });

  it('NO cambia mayúsculas: el nombre se muestra como lo escribió la persona', () => {
    expect(normalizarTitulo('SAP')).toBe('SAP');
  });
});

describe('validarTitulo', () => {
  it('acepta habilidades reales de cualquier profesión', () => {
    for (const t of [
      'Derecho Laboral',
      'SAP',
      'Lean Manufacturing',
      'Anestesiología',
      'Soldadura TIG',
      'Diseño de Interiores',
    ]) {
      const r = validarTitulo(t);
      expect(r.ok).toBe(true);
    }
  });

  it('rechaza lo que es demasiado corto', () => {
    const r = validarTitulo('a');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('demasiado corto');
  });

  it('rechaza lo que es demasiado largo', () => {
    const r = validarTitulo('x'.repeat(TITULO_MAX + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('demasiado largo');
  });

  it('rechaza símbolos y números sueltos (espejo de [[:alpha:]]{2})', () => {
    for (const basura of ['123', '---', '$$$', '1 2 3', '?!']) {
      const r = validarTitulo(basura);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('no parece una habilidad');
    }
  });

  it('acepta acentos y ñ (el sistema es en español, no puede tropezar con esto)', () => {
    expect(validarTitulo('Automatización').ok).toBe(true);
    expect(validarTitulo('Diseño').ok).toBe(true);
  });

  it('devuelve el título ya normalizado para mandarlo a la base', () => {
    const r = validarTitulo('  Gestión   de   Proyectos ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.titulo).toBe('Gestión de Proyectos');
  });

  it('un título de exactamente el largo máximo entra', () => {
    expect(validarTitulo('ab' + 'c'.repeat(TITULO_MAX - 2)).ok).toBe(true);
  });
});


describe('tomarExamenPendiente — el puente que sobrevive el cambio de pantalla', () => {
  it('devuelve el pedido guardado', () => {
    sessionStorage.setItem(CLAVE, JSON.stringify({ nodeId: 'abc-123', titulo: 'Derecho Laboral' }));
    const p = tomarExamenPendiente();
    expect(p).not.toBeNull();
    expect(p!.nodeId).toBe('abc-123');
    expect(p!.titulo).toBe('Derecho Laboral');
  });

  it('CONSUME el pedido: la segunda vez ya no está', () => {
    // Ésta es la garantía que importa: si no se consumiera, el examen se
    // reabriría solo cada vez que se entra a la pestaña Habilidades.
    sessionStorage.setItem(CLAVE, JSON.stringify({ nodeId: 'abc-123', titulo: 'SAP' }));
    expect(tomarExamenPendiente()).not.toBeNull();
    expect(tomarExamenPendiente()).toBeNull();
  });

  it('sin pedido guardado devuelve null', () => {
    sessionStorage.removeItem(CLAVE);
    expect(tomarExamenPendiente()).toBeNull();
  });

  it('no explota con datos corruptos ni incompletos', () => {
    sessionStorage.setItem(CLAVE, '{roto');
    expect(tomarExamenPendiente()).toBeNull();

    sessionStorage.setItem(CLAVE, JSON.stringify({ titulo: 'Sin id' }));
    expect(tomarExamenPendiente()).toBeNull();
  });
});
