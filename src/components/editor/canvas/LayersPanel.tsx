/**
 * Layers panel: lists the objects of the active page in z-order (top layer
 * first), adds, duplicates, selects, toggles visibility and lock, reorders and
 * deletes. Every action goes through the store, so the canvas and the panel
 * never disagree. The add affordance inserts the shared default shape — the
 * same one the shapes drawer inserts — so the panel is never a dead end.
 * The docked section already labels the region, so this body is not a second
 * landmark with the same name.
 */

import { Square, Type } from 'lucide-react';
import { RuneChevronDownIcon } from '@/components/icons/rune/ChevronDown';
import { RuneChevronUpIcon } from '@/components/icons/rune/ChevronUp';
import { RuneCopyIcon } from '@/components/icons/rune/Copy';
import { RuneEyeIcon } from '@/components/icons/rune/Eye';
import { RuneEyeOffIcon } from '@/components/icons/rune/EyeOff';
import { RuneImageIcon } from '@/components/icons/rune/Image';
import { RuneLockIcon } from '@/components/icons/rune/Lock';
import { RuneLockOpenIcon } from '@/components/icons/rune/LockOpen';
import { RunePlusIcon } from '@/components/icons/rune/Plus';
import { RuneSparklesIcon } from '@/components/icons/rune/Sparkles';
import { RuneTrash2Icon } from '@/components/icons/rune/Trash2';
import { useI18n } from '@/i18n/useI18n';
import { objectPatch } from '@/lib/documentOps';
import { createShapePreset } from '@/lib/shapePresets';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import type { DocumentObject } from '@/lib/document';
import { IconButton } from './IconButton';

function ObjectIcon({ type }: { type: DocumentObject['type'] }) {
  // Square/Type stay lucide on purpose: the vendored normal set has no 1:1 counterpart (panels/registry.ts).
  if (type === 'text') return <Type className="h-4 w-4 shrink-0" />;
  if (type === 'image') return <RuneImageIcon className="h-4 w-4 shrink-0" />;

  return <Square className="h-4 w-4 shrink-0" />;
}

export function LayersPanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const selectObject = useStore((state) => state.selectObject);
  const addObject = useStore((state) => state.addObject);
  const updateObject = useStore((state) => state.updateObject);
  const removeObject = useStore((state) => state.removeObject);
  const moveObjectZ = useStore((state) => state.moveObjectZ);
  const duplicateObject = useStore((state) => state.duplicateObject);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  if (!page) return null;

  const rows = [...page.objects].reverse();
  const selected = page.objects.find((object) => object.id === selectedObjectId) ?? null;

  // Same default as the shapes drawer: the shared preset, inserted through
  // the store so the selection follows the new object.
  const addDefaultShape = () => {
    addObject(createShapePreset('rect', page));
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-end gap-1 px-1">
        <IconButton label={copy.canvas.addObject} testId="layer-add" onClick={addDefaultShape}>
          <RunePlusIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={copy.canvas.duplicateObject}
          testId="layer-duplicate"
          disabled={!selected}
          onClick={() => selected && duplicateObject(selected.id)}
        >
          <RuneCopyIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={copy.canvas.layerUp}
          testId="layer-up"
          disabled={!selected}
          onClick={() => selected && moveObjectZ(selected.id, 'up')}
        >
          <RuneChevronUpIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={copy.canvas.layerDown}
          testId="layer-down"
          disabled={!selected}
          onClick={() => selected && moveObjectZ(selected.id, 'down')}
        >
          <RuneChevronDownIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={copy.canvas.deleteObject}
          testId="layer-delete"
          disabled={!selected}
          onClick={() => selected && removeObject(selected.id)}
        >
          <RuneTrash2Icon className="h-4 w-4" />
        </IconButton>
      </div>

      {rows.length === 0 ? (
        <p className="px-1 pt-3 text-sm text-[hsl(var(--text-muted))]">{copy.canvas.layersEmpty}</p>
      ) : (
        <ul className="mt-2 space-y-1" data-testid="layer-list">
          {rows.map((object) => {
            const isSelected = object.id === selectedObjectId;

            return (
              <li
                key={object.id}
                data-testid="layer-row"
                data-object-type={object.type}
                className={cn(
                  'flex items-center gap-1 rounded-[0.9rem] border border-transparent px-1 py-1 transition',
                  isSelected
                    ? 'border-border/80 bg-[hsl(var(--surface-muted))]'
                    : 'hover:border-border/60 hover:bg-[hsl(var(--surface-muted))/0.6]',
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  data-testid="layer-select"
                  onClick={() => selectObject(isSelected ? null : object.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ObjectIcon type={object.type} />
                  <span className="truncate">{object.name}</span>
                </button>
                {object.animation ? (
                  // The layer carries an entrance animation (schema v2): the
                  // badge marks it and names the preset for tests and tooltips.
                  <span
                    data-testid="layer-animation"
                    data-animation={object.animation.preset}
                    title={copy.sidebar.animate}
                    className="flex h-5 w-5 shrink-0 items-center justify-center text-[hsl(var(--text-muted))]"
                  >
                    <RuneSparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                ) : null}
                <IconButton
                  label={object.visible ? copy.canvas.hideObject : copy.canvas.showObject}
                  testId="layer-visibility"
                  pressed={!object.visible}
                  onClick={() => updateObject(object.id, objectPatch(object.type, { visible: !object.visible }))}
                >
                  {object.visible ? <RuneEyeIcon className="h-4 w-4" /> : <RuneEyeOffIcon className="h-4 w-4" />}
                </IconButton>
                <IconButton
                  label={object.locked ? copy.canvas.unlockObject : copy.canvas.lockObject}
                  testId="layer-lock"
                  pressed={object.locked}
                  onClick={() => updateObject(object.id, objectPatch(object.type, { locked: !object.locked }))}
                >
                  {object.locked ? <RuneLockIcon className="h-4 w-4" /> : <RuneLockOpenIcon className="h-4 w-4" />}
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 rounded-[0.9rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.5] px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
          {copy.canvas.selection}
        </p>
        {selected ? (
          <dl className="mt-1 grid grid-cols-4 gap-2 text-xs text-[hsl(var(--text-muted))]">
            <div>
              <dt className="text-[10px] uppercase tracking-wide">X</dt>
              <dd data-testid="selection-x" className="font-semibold text-foreground">
                {Math.round(selected.x)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide">Y</dt>
              <dd data-testid="selection-y" className="font-semibold text-foreground">
                {Math.round(selected.y)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide">W</dt>
              <dd data-testid="selection-width" className="font-semibold text-foreground">
                {Math.round(selected.width)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide">H</dt>
              <dd data-testid="selection-height" className="font-semibold text-foreground">
                {Math.round(selected.height)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-1 text-xs text-[hsl(var(--text-muted))]">—</p>
        )}
      </div>
    </div>
  );
}
