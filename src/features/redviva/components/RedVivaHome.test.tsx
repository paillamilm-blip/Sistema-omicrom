import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodoRed, RedVivaModel } from '../services/redViva';
import { buildRedViva } from '../services/redViva';
import { RedVivaHome } from './RedVivaHome';

const mocks = vi.hoisted(() => ({ useRedViva: vi.fn() }));

vi.mock('../hooks/useRedViva', () => ({ useRedViva: mocks.useRedViva }));
vi.mock('@/store/AppContext', () => ({
  useApp: () => ({ profile: null, gemelo: null }),
}));
vi.mock('@/shared/hooks/useUserColor', () => ({ useUserColor: () => '#ffb02e' }));
vi.mock('framer-motion', () => ({ useReducedMotion: () => false }));
vi.mock('./RedVivaCanvas', () => ({
  RedVivaCanvas: ({ model, onSelect }: { model: RedVivaModel; onSelect?: (nodo: NodoRed) => void }) => (
    <button type="button" aria-label="Seleccionar desde el mapa" onClick={() => model.nodos[0] && onSelect?.(model.nodos[0])}>
      Mapa
    </button>
  ),
}));
vi.mock('./NodoFicha', async () => {
  const React = await import('react');
  return {
    NodoFicha: React.forwardRef<HTMLElement, { id: string; nodo: NodoRed; onCerrar?: () => void }>(
      ({ id, nodo, onCerrar }, ref) => (
        <section ref={ref} id={id} tabIndex={-1} aria-labelledby={`${id}-title`}>
          <h3 id={`${id}-title`}>{nodo.label}</h3>
          <button type="button" onClick={onCerrar}>Cerrar detalle</button>
        </section>
      ),
    ),
  };
});

const mercado = [{ id: 'job-1', title: 'Analista', required_skills: ['Excel'], status: 'OPEN' }];

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('RedVivaHome — estados y foco', () => {
  it('el empty con mercado hace early return y conserva el CTA real', () => {
    const onSubirCv = vi.fn();
    mocks.useRedViva.mockReturnValue({
      model: buildRedViva({ jobs: mercado }),
      isLoading: false,
      fondoSaldo: null,
      pruebasDisponibles: true,
    });

    render(<RedVivaHome onSubirCv={onSubirCv} />);

    expect(screen.queryByRole('button', { name: 'Seleccionar desde el mapa' })).toBeNull();
    expect(screen.queryByText('Tu próxima jugada')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Subir mi CV' }));
    expect(onSubirCv).toHaveBeenCalledTimes(1);
  });

  it('muestra loading sin confundirlo con el estado vacío', () => {
    mocks.useRedViva.mockReturnValue({
      model: buildRedViva({}),
      isLoading: true,
      fondoSaldo: null,
      pruebasDisponibles: false,
    });

    render(<RedVivaHome />);

    expect(screen.getByLabelText('Mapa de habilidades').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Subir mi CV' })).toBeNull();
  });

  it('el CTA vacío emite la intención técnica de abrir el CV como respaldo', () => {
    mocks.useRedViva.mockReturnValue({
      model: buildRedViva({}),
      isLoading: false,
      fondoSaldo: null,
      pruebasDisponibles: true,
    });
    const dispatch = vi.spyOn(window, 'dispatchEvent');

    render(<RedVivaHome />);
    fireEvent.click(screen.getByRole('button', { name: 'Subir mi CV' }));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'omicron:request-cv' }));
  });

  it('si el historial no está disponible no afirma que hay cero pruebas', () => {
    mocks.useRedViva.mockReturnValue({
      model: buildRedViva({ skillsDetail: [{ name: 'Excel', pct: 90 }], jobs: [] }),
      isLoading: false,
      fondoSaldo: null,
      pruebasDisponibles: false,
    });

    render(<RedVivaHome />);

    expect(screen.getByText('1 habilidad registrada')).toBeTruthy();
    expect(screen.getByText(/No pudimos consultar tu historial de pruebas/)).toBeTruthy();
    expect(screen.queryByText(/todavía no probaste ninguna/)).toBeNull();
  });

  it('desde SVG enfoca el inspector y al cerrar devuelve foco a la fila', () => {
    mocks.useRedViva.mockReturnValue({
      model: buildRedViva({ skillsDetail: [{ name: 'Excel', pct: 90 }], jobs: [] }),
      isLoading: false,
      fondoSaldo: 0,
      pruebasDisponibles: true,
    });

    const rendered = render(<RedVivaHome />);
    const fila = screen.getByRole('button', { name: /Excel/i });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar desde el mapa' }));

    const inspector = document.getElementById('red-viva-inspector');
    expect(document.activeElement).toBe(inspector);

    const cerrar = screen.getByRole('button', { name: 'Cerrar detalle' });
    cerrar.focus();
    mocks.useRedViva.mockReturnValue({
      model: buildRedViva({ skillsDetail: [{ name: 'Excel', pct: 91 }], jobs: [] }),
      isLoading: false,
      fondoSaldo: 0,
      pruebasDisponibles: true,
    });
    rendered.rerender(<RedVivaHome />);
    expect(document.activeElement).toBe(cerrar);

    fireEvent.click(cerrar);
    expect(document.activeElement).toBe(fila);
  });
});
