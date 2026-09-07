import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { C } from '@/theme';
import { NodoEstadoMarca, piezaRompecabezasPath } from './NodoEstadoMarca';

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

describe('NodoEstadoMarca — variante de nodo (sabor A / pieza)', () => {
  const userColor = '#7dd3fc';

  it("variante por defecto ('circulo') no cambia el marcado del estado probado (no-regresión)", () => {
    const container = render(<NodoEstadoMarca estado="solido" color={userColor} />).container;
    const grupo = container.querySelector('[data-node-state="solido"]');
    expect(grupo).not.toBeNull();
    // Sigue siendo un CÍRCULO relleno con el color + el check; sin path de pieza.
    const circulo = grupo?.querySelector('circle');
    expect(circulo).not.toBeNull();
    expect(circulo?.getAttribute('fill')).toBe(userColor);
    expect(grupo?.getAttribute('data-node-variant')).toBe('circulo');
    // El check sigue presente.
    expect(grupo?.querySelector('path')).not.toBeNull();
  });

  it("variante='pieza' dibuja el estado 'solido' como pieza de rompecabezas conservando el check", () => {
    const container = render(
      <NodoEstadoMarca estado="solido" color={userColor} variante="pieza" />,
    ).container;
    const grupo = container.querySelector('[data-node-state="solido"]');
    expect(grupo).not.toBeNull();
    expect(grupo?.getAttribute('data-node-variant')).toBe('pieza');
    // Ya NO es un círculo: es un contorno de pieza (path relleno) + el check (path).
    expect(grupo?.querySelector('circle')).toBeNull();
    const paths = grupo?.querySelectorAll('path');
    expect(paths?.length).toBe(2);
    // El contorno de la pieza usa curvas (C) — la firma del tab/blank.
    const contorno = paths?.[0];
    expect(contorno?.getAttribute('fill')).toBe(userColor);
    expect(contorno?.getAttribute('d')).toContain('C');
    // El check conserva su relleno de fondo (no color-only): trazo sobre bg.
    const check = paths?.[1];
    expect(check?.getAttribute('fill')).toBe('none');
  });

  it("variante='pieza' extiende la metáfora de puzzle a TODOS los estados conservando la semántica por forma", () => {
    // hueco: contorno de pieza SIN encajar (silueta de puzzle hueca), ya no aro.
    const hueco = render(<NodoEstadoMarca estado="hueco" color={userColor} variante="pieza" />).container;
    const grupoHueco = hueco.querySelector('[data-node-state="hueco"]');
    expect(grupoHueco?.getAttribute('data-node-variant')).toBe('pieza');
    // Es un contorno (path con curvas de tab/blank), sin relleno, sin círculo.
    expect(grupoHueco?.querySelector('circle')).toBeNull();
    const contornoHueco = grupoHueco?.querySelector('path');
    expect(contornoHueco?.getAttribute('fill')).toBe('none');
    expect(contornoHueco?.getAttribute('d')).toContain('C');
    cleanup();

    // latiendo: pieza exterior + pieza interior que late + punto. Silueta de
    // puzzle (paths con curvas), no aros; conserva el punto central.
    const latiendo = render(<NodoEstadoMarca estado="latiendo" color={userColor} variante="pieza" />).container;
    const grupoLat = latiendo.querySelector('[data-node-state="latiendo"]');
    expect(grupoLat?.getAttribute('data-node-variant')).toBe('pieza');
    const pathsLat = grupoLat?.querySelectorAll('path');
    expect(pathsLat?.length).toBe(2); // contorno + interior
    expect(pathsLat?.[0].getAttribute('d')).toContain('C');
    // El punto central se conserva (único elemento circle).
    expect(grupoLat?.querySelectorAll('circle')).toHaveLength(1);
    cleanup();

    // ausente: silueta de puzzle DISCONTINUA + cruz, en Oro (mercado intacto).
    const ausente = render(<NodoEstadoMarca estado="ausente" color={C.gold} variante="pieza" />).container;
    const grupoAus = ausente.querySelector('[data-node-state="ausente"]');
    expect(grupoAus?.getAttribute('data-node-variant')).toBe('pieza');
    // Ya no es un polígono/hexágono: es un contorno de pieza discontinuo.
    expect(grupoAus?.querySelector('polygon')).toBeNull();
    const paths = grupoAus?.querySelectorAll('path');
    expect(paths?.length).toBe(2); // contorno de pieza + cruz
    const contornoAus = paths?.[0];
    expect(contornoAus?.getAttribute('d')).toContain('C');
    expect(contornoAus?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(contornoAus?.getAttribute('stroke')).toBe(C.gold);
  });

  it('piezaRompecabezasPath produce un contorno cerrado con curvas de tab/blank', () => {
    const d = piezaRompecabezasPath(0, 0, 10);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
    // Dos curvas cúbicas: el saliente (arriba) y el entrante (derecha).
    expect((d.match(/C /g) ?? []).length).toBe(2);
  });
});
