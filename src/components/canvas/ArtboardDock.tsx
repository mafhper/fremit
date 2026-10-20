/**
 * ArtboardDock.tsx
 * Barra flutuante da home: escolhe o formato da prancheta e o clima do fundo (shader).
 * Componente controlado e sem textos próprios: os rótulos chegam por props (i18n no chamador).
 */

import { liquidMoods, type LiquidMood } from '@/components/hero/presets';
import { cn } from '@/lib/utils';
import type { ArtboardFormatId } from './formats';

interface DockOption<T extends string> {
  id: T;
  label: string;
}

interface ArtboardDockProps {
  label: string;
  formatLabel: string;
  moodLabel: string;
  formats: ReadonlyArray<DockOption<ArtboardFormatId>>;
  format: ArtboardFormatId;
  onFormatChange: (format: ArtboardFormatId) => void;
  moods: ReadonlyArray<DockOption<LiquidMood>>;
  mood: LiquidMood;
  onMoodChange: (mood: LiquidMood) => void;
  className?: string;
}

export function ArtboardDock({
  label,
  formatLabel,
  moodLabel,
  formats,
  format,
  onFormatChange,
  moods,
  mood,
  onMoodChange,
  className,
}: ArtboardDockProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        'flex max-w-[94vw] flex-wrap items-center justify-center gap-1.5 rounded-[1.75rem] border border-border/60 bg-background/60 p-1.5 backdrop-blur-xl sm:rounded-full',
        className,
      )}
    >
      <div role="group" aria-label={formatLabel} className="flex items-center gap-1">
        {formats.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.id === format}
            onClick={() => onFormatChange(option.id)}
            className={cn(
              'whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              option.id === format
                ? 'bg-foreground text-background'
                : 'text-[hsl(var(--text-muted))] hover:bg-foreground/10 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <span aria-hidden="true" className="mx-1.5 hidden h-5 w-px bg-border sm:block" />

      <div role="group" aria-label={moodLabel} className="flex items-center gap-2 pr-1">
        {moods.map((option) => {
          const preset = liquidMoods[option.id];
          return (
            <button
              key={option.id}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={option.id === mood}
              onClick={() => onMoodChange(option.id)}
              style={{ background: `linear-gradient(135deg, ${preset.colorA}, ${preset.colorB})` }}
              className={cn(
                'h-6 w-6 shrink-0 rounded-full border-2 border-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                option.id === mood && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
