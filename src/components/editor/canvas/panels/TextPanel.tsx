/**
 * Text drawer of the canvas shell: the straight presets (subheading and
 * body), the six named system-font pairings, the bulleted/numbered lists and
 * the curved arc up/down (schema v2). Every button builds its object(s)
 * through `src/lib/textPresets` with the active page size and inserts them
 * through the store, so a preset scales with the page and the canvas
 * reconciles like any other edit.
 */

import { type ReactNode } from 'react';
import { useI18n } from '@/i18n/useI18n';
import type { ArcDirection } from '@/lib/document';
import {
  FONT_PAIRINGS,
  createArcTextPreset,
  createFontPairingTexts,
  createTextPreset,
  type FontPairingId,
  type TextPresetId,
} from '@/lib/textPresets';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

function PresetButton({
  testId,
  label,
  onClick,
  children,
  className,
}: {
  testId: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'rounded-[0.9rem] border border-border/70 bg-background px-3 py-2 text-left transition',
        'hover:border-accent/50 hover:bg-[hsl(var(--surface-muted))/0.6]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
      {children}
    </h3>
  );
}

export function TextPanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const addObject = useStore((state) => state.addObject);
  const addObjects = useStore((state) => state.addObjects);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  if (!page) return null;

  const pageSize = { width: page.width, height: page.height };
  const presetLabels: Record<TextPresetId, string> = {
    subheading: copy.text.subheading,
    body: copy.text.body,
    'bullet-list': copy.text.bulletedList,
    'numbered-list': copy.text.numberedList,
  };
  const pairingLabels: Record<FontPairingId, string> = {
    classic: copy.text.classic,
    modern: copy.text.modern,
    editorial: copy.text.editorial,
    playful: copy.text.playful,
    poster: copy.text.poster,
    elegant: copy.text.elegant,
  };

  const insertPreset = (presetId: TextPresetId) => {
    addObject(createTextPreset(presetId, pageSize));
  };

  // The pair is the point of a pairing: heading and body land in one store
  // write, so the document never holds half a pairing, and the selection
  // follows the last object inserted (the body).
  const insertPairing = (pairingId: FontPairingId) => {
    addObjects(createFontPairingTexts(pairingId, pageSize));
  };

  const insertArc = (direction: ArcDirection) => {
    addObject(createArcTextPreset(direction, pageSize));
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SectionTitle>{copy.text.headings}</SectionTitle>
        <div className="grid gap-2">
          <PresetButton
            testId="text-preset-subheading"
            label={presetLabels.subheading}
            onClick={() => insertPreset('subheading')}
          >
            <span className="block truncate text-lg font-semibold leading-7">
              {presetLabels.subheading}
            </span>
          </PresetButton>
          <PresetButton
            testId="text-preset-body"
            label={presetLabels.body}
            onClick={() => insertPreset('body')}
          >
            <span className="block truncate text-xs leading-5">{presetLabels.body}</span>
          </PresetButton>
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>{copy.text.fontPairings}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {FONT_PAIRINGS.map((pairing) => (
            <PresetButton
              key={pairing.id}
              testId={`text-preset-${pairing.id}`}
              label={pairingLabels[pairing.id]}
              onClick={() => insertPairing(pairing.id)}
            >
              <span
                className="block truncate text-sm leading-6"
                style={{ fontFamily: pairing.heading.stack, fontWeight: pairing.heading.weight }}
              >
                {pairingLabels[pairing.id]}
              </span>
              <span
                className="block truncate text-[11px] leading-4 text-[hsl(var(--text-muted))]"
                style={{ fontFamily: pairing.body.stack, fontWeight: pairing.body.weight }}
              >
                Aa Bb Cc · 123
              </span>
            </PresetButton>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>{copy.text.lists}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <PresetButton
            testId="text-preset-bullet-list"
            label={presetLabels['bullet-list']}
            onClick={() => insertPreset('bullet-list')}
          >
            <span className="block truncate text-xs leading-5">• {presetLabels['bullet-list']}</span>
          </PresetButton>
          <PresetButton
            testId="text-preset-numbered-list"
            label={presetLabels['numbered-list']}
            onClick={() => insertPreset('numbered-list')}
          >
            <span className="block truncate text-xs leading-5">
              1. {presetLabels['numbered-list']}
            </span>
          </PresetButton>
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>{copy.text.curved}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <PresetButton
            testId="text-preset-arc-up"
            label={copy.text.arcUp}
            onClick={() => insertArc('up')}
          >
            <span className="block truncate text-sm leading-6" aria-hidden="true">
              ⌒ {copy.text.arcUp}
            </span>
          </PresetButton>
          <PresetButton
            testId="text-preset-arc-down"
            label={copy.text.arcDown}
            onClick={() => insertArc('down')}
          >
            <span className="block truncate text-sm leading-6" aria-hidden="true">
              ⌄ {copy.text.arcDown}
            </span>
          </PresetButton>
        </div>
      </section>
    </div>
  );
}
