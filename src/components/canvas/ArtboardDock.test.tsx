/**
 * ArtboardDock.test.tsx
 * Cobre a barra de formato e clima: estado pressionado e callbacks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ArtboardDock } from './ArtboardDock';

afterEach(cleanup);

const formats = [
  { id: 'hero', label: 'Hero' },
  { id: 'banner', label: 'Banner' },
] as const;
const moods = [
  { id: 'morning', label: 'Manhã' },
  { id: 'night', label: 'Noite' },
  { id: 'chrome', label: 'Cromo' },
] as const;

function setup(overrides: Partial<React.ComponentProps<typeof ArtboardDock>> = {}) {
  const onFormatChange = vi.fn();
  const onMoodChange = vi.fn();
  render(
    <ArtboardDock
      label="Formato e clima"
      formatLabel="Formato"
      moodLabel="Clima"
      formats={formats}
      format="hero"
      onFormatChange={onFormatChange}
      moods={moods}
      mood="night"
      onMoodChange={onMoodChange}
      {...overrides}
    />,
  );
  return { onFormatChange, onMoodChange };
}

describe('ArtboardDock', () => {
  it('expõe a barra e os dois grupos com nomes acessíveis', () => {
    setup();
    expect(screen.getByRole('toolbar', { name: 'Formato e clima' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Formato' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Clima' })).toBeInTheDocument();
  });

  it('marca o formato e o clima ativos com aria-pressed', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Hero' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Banner' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Noite' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Manhã' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('dispara os callbacks com o id escolhido', () => {
    const { onFormatChange, onMoodChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Banner' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cromo' }));
    expect(onFormatChange).toHaveBeenCalledWith('banner');
    expect(onMoodChange).toHaveBeenCalledWith('chrome');
  });
});
