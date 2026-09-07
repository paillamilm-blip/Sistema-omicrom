import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { C } from '@/theme';
import { NodoEstadoMarca } from './NodoEstadoMarca';

afterEach(cleanup);

describe('NodoEstadoMarca — semántica independiente del color', () => {
  it('con Oro en todos los estados conserva formas y patrones distinguibles', () => {
    const probado = render(<NodoEstadoMarca estado="solido" color={C.gold} />).container;
    expect(probado.querySelector('[data-node-state="solido"] circle')?.getAttribute('fill')).toBe(C.gold);
    expect(probado.querySelector('[data-node-state="solido"] path')).not.toBeNull();
    cleanup();

    const declarado = render(<NodoEstadoMarca estado="hueco" color={C.gold} />).container;
    expect(declarado.querySelector('[data-node-state="hueco"] circle')?.getAttribute('fill')).toBe('none');
    expect(declarado.querySelector('[data-node-state="hueco"] polygon')).toBeNull();
    cleanup();

    const enPrueba = render(<NodoEstadoMarca estado="latiendo" color={C.gold} />).container;
    expect(enPrueba.querySelectorAll('[data-node-state="latiendo"] circle')).toHaveLength(3);
    cleanup();

    const ausente = render(<NodoEstadoMarca estado="ausente" color={C.gold} />).container;
    const hexagono = ausente.querySelector('[data-node-state="ausente"] polygon');
    expect(hexagono).not.toBeNull();
    expect(hexagono?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(ausente.querySelector('[data-node-state="ausente"] path')).not.toBeNull();
  });
});
