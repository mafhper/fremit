/**
 * Animate sidebar (block F of the sidebar plan): the Element entrances and
 * the Page transitions of schema v2, with preview on the canvas.
 *
 * The docked section owns the `sidebar-panel-animate` test id — it is the
 * shell's `PanelSection` wrapper, not this file; the ids here are the inner
 * sections (`animate-element`/`animate-page`) and the controls.
 *
 * Applying writes the document through the store — an object animation for
 * the selection, a page transition for the active page. Previewing goes the
 * other way: a store request the canvas stage plays without ever touching the
 * document. Export of animation stays in the export slice; this panel defines
 * and previews only, and the schema carries no audio anywhere.
 */

import { Presentation, Play } from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import {
  ANIMATION_DIRECTIONS,
  ANIMATION_EASINGS,
  DEFAULT_ANIMATION_DURATION_MS,
  MAX_ANIMATION_DURATION_MS,
  MIN_ANIMATION_DURATION_MS,
  type AnimationDirection,
  type AnimationEasing,
  type ElementAnimationPreset,
  type PageTransitionPreset,
} from '@/lib/document';
import { objectPatch } from '@/lib/documentOps';
import {
  ELEMENT_PRESETS,
  TRANSITION_PRESETS,
  createElementAnimation,
  createPageTransition,
  findElementPreset,
  findTransitionPreset,
} from '@/lib/animate/presets';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { NumberField } from './NumberField';

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
      {children}
    </h3>
  );
}

function PresetButton({
  testId,
  label,
  pressed,
  onClick,
}: {
  testId: string;
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded-[0.7rem] border px-2 py-1.5 text-[11px] font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pressed
          ? 'border-accent/60 bg-[hsl(var(--surface-muted))] text-foreground'
          : 'border-border/70 bg-background text-[hsl(var(--text-muted))] hover:border-accent/40 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function ControlLabel({ children }: { children: string }) {
  return (
    <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
      {children}
    </span>
  );
}

function toEasing(value: string): AnimationEasing {
  return (ANIMATION_EASINGS as readonly string[]).includes(value)
    ? (value as AnimationEasing)
    : 'easeOut';
}

function toDirection(value: string): AnimationDirection {
  return (ANIMATION_DIRECTIONS as readonly string[]).includes(value)
    ? (value as AnimationDirection)
    : 'up';
}

interface AnimationFields {
  durationMs: number;
  easing: AnimationEasing;
  direction: AnimationDirection;
}

interface AnimationControlsProps {
  /** Test-id prefix: the element and the page controls never collide. */
  idPrefix: string;
  value: AnimationFields | null;
  /** The current preset decides whether the direction control applies. */
  directionEnabled: boolean;
  onChange: (fields: Partial<AnimationFields>) => void;
}

/** Duration/easing/direction of one animation; disabled without a value. */
function AnimationControls({
  idPrefix,
  value,
  directionEnabled,
  onChange,
}: AnimationControlsProps) {
  const { copy } = useI18n();

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-2">
        <ControlLabel>{copy.animate.duration}</ControlLabel>
        <NumberField
          label={copy.animate.duration}
          testId={`${idPrefix}-duration`}
          value={value?.durationMs ?? DEFAULT_ANIMATION_DURATION_MS}
          min={MIN_ANIMATION_DURATION_MS}
          max={MAX_ANIMATION_DURATION_MS}
          disabled={!value}
          onCommit={(durationMs) => onChange({ durationMs })}
        />
      </div>

      <div className="flex items-center gap-2">
        <ControlLabel>{copy.animate.easing}</ControlLabel>
        <Select
          value={value?.easing ?? 'easeOut'}
          onValueChange={(next) => onChange({ easing: toEasing(next) })}
          disabled={!value}
        >
          <SelectTrigger
            aria-label={copy.animate.easing}
            data-testid={`${idPrefix}-easing`}
            className="h-8 min-w-0 flex-1 rounded-lg"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATION_EASINGS.map((easing) => (
              <SelectItem key={easing} value={easing}>
                {copy.animate.easings[easing]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <ControlLabel>{copy.animate.direction}</ControlLabel>
        <Select
          value={value?.direction ?? 'up'}
          onValueChange={(next) => onChange({ direction: toDirection(next) })}
          disabled={!value || !directionEnabled}
        >
          <SelectTrigger
            aria-label={copy.animate.direction}
            data-testid={`${idPrefix}-direction`}
            className="h-8 min-w-0 flex-1 rounded-lg"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATION_DIRECTIONS.map((direction) => (
              <SelectItem key={direction} value={direction}>
                {copy.animate.directions[direction]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function AnimatePanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const updateObject = useStore((state) => state.updateObject);
  const setPageTransition = useStore((state) => state.setPageTransition);
  const requestAnimationPreview = useStore((state) => state.requestAnimationPreview);
  const startPresenting = useStore((state) => state.startPresenting);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  const selected = page?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const animation = selected?.animation ?? null;
  const transition = page?.transition ?? null;

  if (!page) return null;

  const applyElementPreset = (preset: ElementAnimationPreset) => {
    if (!selected || animation?.preset === preset) return;

    updateObject(
      selected.id,
      objectPatch(selected.type, { animation: createElementAnimation(preset) }),
    );
  };

  const patchElementAnimation = (fields: Partial<AnimationFields>) => {
    if (!selected || !animation) return;

    updateObject(selected.id, objectPatch(selected.type, { animation: { ...animation, ...fields } }));
  };

  const removeElementAnimation = () => {
    if (!selected || !animation) return;

    updateObject(selected.id, objectPatch(selected.type, { animation: null }));
  };

  const applyPageTransition = (preset: PageTransitionPreset | 'none') => {
    if (preset === 'none') {
      if (transition) setPageTransition(page.id, null);
      return;
    }

    if (transition?.preset === preset) return;

    setPageTransition(page.id, createPageTransition(preset));
  };

  const patchPageTransition = (fields: Partial<AnimationFields>) => {
    if (!transition) return;

    setPageTransition(page.id, { ...transition, ...fields });
  };

  const elementDirectionEnabled = animation
    ? (findElementPreset(animation.preset)?.supportsDirection ?? false)
    : false;
  const transitionDirectionEnabled = transition
    ? (findTransitionPreset(transition.preset)?.supportsDirection ?? false)
    : false;
  const pageHasAnimation =
    transition !== null || page.objects.some((object) => object.animation !== null);

  return (
    <div className="space-y-5">
      <section className="space-y-2" data-testid="animate-element">
        <SectionTitle>{copy.animate.element}</SectionTitle>

        {selected ? (
          <>
            <p className="text-[11px] leading-4 text-[hsl(var(--text-muted))]">
              {copy.animate.elementHint}
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              {ELEMENT_PRESETS.map((preset) => (
                <PresetButton
                  key={preset.id}
                  testId={`animate-preset-${preset.id}`}
                  label={copy.animate.presets[preset.id]}
                  pressed={animation?.preset === preset.id}
                  onClick={() => applyElementPreset(preset.id)}
                />
              ))}
            </div>

            <AnimationControls
              idPrefix="animate"
              value={animation}
              directionEnabled={elementDirectionEnabled}
              onChange={patchElementAnimation}
            />

            <div className="flex items-center gap-1.5 pt-1">
              <Button
                type="button"
                data-testid="animate-preview"
                disabled={!animation}
                onClick={() => requestAnimationPreview('element')}
                className="h-8 flex-1 rounded-[0.8rem] px-2 text-xs"
              >
                <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {copy.animate.preview}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="animate-clear"
                disabled={!animation}
                onClick={removeElementAnimation}
                className="h-8 rounded-[0.8rem] px-2 text-xs"
              >
                {copy.animate.remove}
              </Button>
            </div>
          </>
        ) : (
          <p
            data-testid="animate-no-selection"
            className="text-xs leading-5 text-[hsl(var(--text-muted))]"
          >
            {copy.animate.noSelection}
          </p>
        )}
      </section>

      <section className="space-y-2" data-testid="animate-page">
        <SectionTitle>{copy.animate.page}</SectionTitle>
        <p className="text-[11px] leading-4 text-[hsl(var(--text-muted))]">
          {copy.animate.pageHint}
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          <PresetButton
            testId="animate-transition-none"
            label={copy.animate.none}
            pressed={transition === null}
            onClick={() => applyPageTransition('none')}
          />
          {TRANSITION_PRESETS.map((preset) => (
            <PresetButton
              key={preset.id}
              testId={`animate-transition-${preset.id}`}
              label={copy.animate.transitions[preset.id]}
              pressed={transition?.preset === preset.id}
              onClick={() => applyPageTransition(preset.id)}
            />
          ))}
        </div>

        <AnimationControls
          idPrefix="animate-transition"
          value={transition}
          directionEnabled={transitionDirectionEnabled}
          onChange={patchPageTransition}
        />

        <div className="flex items-center gap-1.5 pt-1">
          <Button
            type="button"
            data-testid="animate-preview-page"
            disabled={!pageHasAnimation}
            onClick={() => requestAnimationPreview('page')}
            className="h-8 flex-1 rounded-[0.8rem] px-2 text-xs"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {copy.animate.previewPage}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="animate-present"
            onClick={startPresenting}
            className="h-8 rounded-[0.8rem] px-2 text-xs"
          >
            <Presentation className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {copy.animate.present}
          </Button>
        </div>
      </section>
    </div>
  );
}
