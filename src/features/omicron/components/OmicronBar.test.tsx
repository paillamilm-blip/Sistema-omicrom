// features/omicron/components/OmicronBar.test.tsx
// Test de render de la barra Ómicrom. Cubre (a) el placeholder EXACTO por modo
// pantalla, (b) que el modo 'lectura' emite la burbuja con el atributo
// data-omicrom-reply llevando el texto REAL que le pasa el shell (que Ómicrom
// "lee", sin inventar), y (c) que sin texto de lectura no hay burbuja. El
// atributo data-omicrom-reply queda así con un consumidor real: este test lo
// afirma como contrato del modo lectura.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OMICRON_BAR_PLACEHOLDER_FULLSCREEN,
  OMICRON_BAR_PLACEHOLDER_RESTING,
  OmicronBar,
  type OmicronBarProps,
} from './OmicronBar';

afterEach(cleanup);

const noop = () => {};

function baseProps(overrides: Partial<OmicronBarProps> = {}): OmicronBarProps {
  return {
    orbColor: '#7dd3fc',
    inputText: '',
    onInputChange: noop,
    onSubmit: noop,
    onFocus: noop,
    onBlur: noop,
    inputFocused: false,
    hasResponse: false,
    isListening: false,
    onToggleListening: noop,
    ...overrides,
  };
}

describe('OmicronBar — placeholder exacto por contexto', () => {
  it('en reposo (home) usa el placeholder exacto de reposo', () => {
    render(<OmicronBar {...baseProps()} />);
    expect(screen.getByPlaceholderText(OMICRON_BAR_PLACEHOLDER_RESTING)).not.toBeNull();
  });

  it('en fullscreen usa el placeholder exacto de fullscreen', () => {
    render(<OmicronBar {...baseProps({ fullscreen: true })} />);
    expect(screen.getByPlaceholderText(OMICRON_BAR_PLACEHOLDER_FULLSCREEN)).not.toBeNull();
  });
});

describe('OmicronBar — modo lectura y el contrato data-omicrom-reply', () => {
  it('en modo lectura emite la burbuja data-omicrom-reply con el texto REAL', () => {
    const textoReal = 'Probaste 2 de 5 habilidades. Las 3 restantes todavía no tienen una prueba.';
    const { container } = render(
      <OmicronBar {...baseProps({ mode: 'lectura', lectura: textoReal })} />,
    );
    const burbuja = container.querySelector('[data-omicrom-reply="true"]');
    expect(burbuja).not.toBeNull();
    // La burbuja muestra EXACTAMENTE el texto que le pasó el shell (no inventa).
    expect(burbuja?.textContent).toContain(textoReal);
    // Marca visible con la M final (nunca 'omicron' con N en texto visible).
    expect(container.textContent).toContain('Ómicrom');
  });

  it('en modo lectura SIN texto (red vacía) NO renderiza la burbuja', () => {
    const { container } = render(
      <OmicronBar {...baseProps({ mode: 'lectura', lectura: null })} />,
    );
    expect(container.querySelector('[data-omicrom-reply="true"]')).toBeNull();
  });

  it("en modo 'ordenes' nunca aparece la burbuja de lectura", () => {
    const { container } = render(
      <OmicronBar {...baseProps({ mode: 'ordenes', lectura: 'ignorado en ordenes' })} />,
    );
    expect(container.querySelector('[data-omicrom-reply="true"]')).toBeNull();
  });
});

describe('OmicronBar — objetivos táctiles y acciones', () => {
  it('enviar el formulario dispara onSubmit cuando hay texto', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <OmicronBar {...baseProps({ inputText: 'ver mis empleos', onSubmit })} />,
    );
    const enviar = screen.getByLabelText('Enviar') as HTMLButtonElement;
    expect(enviar.disabled).toBe(false);
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('el mic dispara onToggleListening', () => {
    const onToggleListening = vi.fn();
    render(<OmicronBar {...baseProps({ onToggleListening })} />);
    screen.getByLabelText('Hablar al Oráculo').click();
    expect(onToggleListening).toHaveBeenCalledTimes(1);
  });
});
