import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider, useNavigation } from './NavigationContext';

afterEach(cleanup);

function Probe() {
  const { activeTab, setActiveTab } = useNavigation();
  return (
    <>
      <output>{activeTab}</output>
      <button type="button" onClick={() => setActiveTab('academia')}>Academia</button>
      <button type="button" onClick={() => setActiveTab('maxskill')}>Habilidades</button>
    </>
  );
}

describe('NavigationContext — un solo camino de aprendizaje', () => {
  it('arranca en el Gemelo y se mueve entre los tres nodos vivos', () => {
    render(<NavigationProvider><Probe /></NavigationProvider>);
    expect(screen.getByText('perfil')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Academia' }));
    expect(screen.getByText('academia')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Habilidades' }));
    expect(screen.getByText('maxskill')).toBeTruthy();
  });
});
