import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider, useNavigation } from './NavigationContext';

afterEach(cleanup);

function Probe() {
  const { activeTab, jobTargetId, jobTargetRequest, openJob, clearJobTarget } = useNavigation();
  return (
    <>
      <output>{`${activeTab}:${jobTargetId ?? 'sin-destino'}:${jobTargetRequest}`}</output>
      <button type="button" onClick={() => openJob('job-42')}>Abrir empleo</button>
      <button type="button" onClick={clearJobTarget}>Limpiar</button>
    </>
  );
}

describe('NavigationContext — intención de empleo', () => {
  it('propaga el jobId sin romper la navegación por pestaña', () => {
    render(<NavigationProvider><Probe /></NavigationProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir empleo' }));
    expect(screen.getByText('empleos:job-42:1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir empleo' }));
    expect(screen.getByText('empleos:job-42:2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByText('empleos:sin-destino:2')).toBeTruthy();
  });
});
