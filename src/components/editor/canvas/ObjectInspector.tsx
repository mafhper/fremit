/**
 * Object section of the right inspector (F1.9): every control writes through
 * `updateObject`, so the canvas reconciles against the document like any other
 * edit and there is never a second source of truth. A locked object disables
 * every editing control, the name input included — only unlock and visibility
 * stay available. The font control offers the shared `FONT_OPTIONS` list plus
 * the current value when it is not one of them, so a document with an arbitrary
 * family still shows its real font instead of an empty select.
 */

import { type ReactNode } from 'react';
import { RuneEyeIcon } from '@/components/icons/rune/Eye';
import { RuneEyeOffIcon } from '@/components/icons/rune/EyeOff';
import { RuneLockIcon } from '@/components/icons/rune/Lock';
import { RuneLockOpenIcon } from '@/components/icons/rune/LockOpen';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import type {
  ArcDirection,
  DocumentObject,
  ImageFit,
  ImageObject,
  ShapeObject,
  TextAlign,
  TextArc,
  TextObject,
} from '@/lib/document';
import { DEFAULT_ARC_AMOUNT, arcTextBox } from '@/lib/arcText';
import { objectPatch, type CommonObjectFields, type DocumentObjectPatch } from '@/lib/documentOps';
import { FONT_OPTIONS } from '@/lib/fonts';
import { round2 } from '@/lib/math';
import { POLYGON_SIDES_RANGE, STAR_INNER_RADIUS_RANGE, STAR_SIDES_RANGE } from '@/lib/shapeGeometry';
import { useStore } from '@/store/useStore';
import { ColorField } from './panels/ColorField';
import { NumberField } from './panels/NumberField';
import { IconButton } from './IconButton';

const FONT_WEIGHTS = [300, 400, 500, 600, 700, 900] as const;

type Patch = (next: DocumentObjectPatch) => void;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Caption above a control; the control itself carries the accessible name. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
        {label}
      </span>
      {children}
    </div>
  );
}

function TextSection({
  object,
  disabled,
  patch,
}: {
  object: TextObject;
  disabled: boolean;
  patch: Patch;
}) {
  const { copy } = useI18n();
  const fontFamilies = FONT_OPTIONS.some((option) => option.stack === object.fontFamily)
    ? FONT_OPTIONS
    : [{ id: 'current' as const, label: object.fontFamily, stack: object.fontFamily }, ...FONT_OPTIONS];
  const weights: readonly number[] = (FONT_WEIGHTS as readonly number[]).includes(object.fontWeight)
    ? FONT_WEIGHTS
    : [object.fontWeight, ...FONT_WEIGHTS];
  const alignLabels: Record<TextAlign, string> = {
    left: copy.inspector.alignLeft,
    center: copy.inspector.alignCenter,
    right: copy.inspector.alignRight,
  };
  const arc = object.arc;
  // A curve change writes the arc *and* the box it derives: the document never
  // carries the box of the previous curvature. Same measurement the canvas
  // codec uses, so both sides agree on the box.
  const setArc = (next: TextArc) => {
    const box = arcTextBox(
      {
        text: object.text,
        fontFamily: object.fontFamily,
        fontSize: object.fontSize,
        fontWeight: object.fontWeight,
      },
      next,
    );

    patch({ type: 'text', arc: next, width: box.width, height: box.height });
  };

  return (
    <Section title={copy.inspector.typography}>
      <div className="space-y-2">
        <Field label={copy.inspector.fontFamily}>
          <Select
            value={object.fontFamily}
            disabled={disabled}
            onValueChange={(value) => patch({ type: 'text', fontFamily: value })}
          >
            <SelectTrigger
              aria-label={copy.inspector.fontFamily}
              data-testid="inspector-font-family"
              className="h-8 rounded-lg"
            >
              <SelectValue placeholder={copy.inspector.fontFamily} />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((option) => (
                <SelectItem key={option.stack} value={option.stack}>
                  <span style={{ fontFamily: option.stack }}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={copy.inspector.fontSize}>
            <NumberField
              label={copy.inspector.fontSize}
              value={object.fontSize}
              min={1}
              disabled={disabled}
              testId="inspector-font-size"
              onCommit={(value) => patch({ type: 'text', fontSize: value })}
            />
          </Field>
          <Field label={copy.inspector.fontWeight}>
            <Select
              value={String(object.fontWeight)}
              disabled={disabled}
              onValueChange={(value) => patch({ type: 'text', fontWeight: Number(value) })}
            >
              <SelectTrigger
                aria-label={copy.inspector.fontWeight}
                data-testid="inspector-font-weight"
                className="h-8 rounded-lg"
              >
                <SelectValue placeholder={copy.inspector.fontWeight} />
              </SelectTrigger>
              <SelectContent>
                {weights.map((weight) => (
                  <SelectItem key={weight} value={String(weight)}>
                    {String(weight)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label={copy.inspector.align}>
          <Select
            value={object.align}
            disabled={disabled}
            onValueChange={(value) => patch({ type: 'text', align: value as TextAlign })}
          >
            <SelectTrigger
              aria-label={copy.inspector.align}
              data-testid="inspector-align"
              className="h-8 rounded-lg"
            >
              <SelectValue placeholder={copy.inspector.align} />
            </SelectTrigger>
            <SelectContent>
              {(['left', 'center', 'right'] as const).map((align) => (
                <SelectItem key={align} value={align}>
                  {alignLabels[align]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={copy.inspector.fill}>
          <div data-testid="inspector-fill">
            <ColorField
              label={copy.inspector.fill}
              value={object.fill}
              disabled={disabled}
              onChange={(color) => patch({ type: 'text', fill: color })}
            />
          </div>
        </Field>

        <Field label={copy.inspector.curve}>
          {arc === null ? (
            <Button
              type="button"
              variant="outline"
              data-testid="inspector-arc-add"
              disabled={disabled}
              onClick={() => setArc({ direction: 'up', amount: DEFAULT_ARC_AMOUNT })}
              className="h-8 w-full justify-start rounded-lg px-2 text-xs"
            >
              {copy.inspector.curveText}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={arc.direction}
                  disabled={disabled}
                  onValueChange={(value) =>
                    setArc({ ...arc, direction: value as ArcDirection })
                  }
                >
                  <SelectTrigger
                    aria-label={copy.inspector.arcDirection}
                    data-testid="inspector-arc-direction"
                    className="h-8 rounded-lg"
                  >
                    <SelectValue placeholder={copy.inspector.arcDirection} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">{copy.text.arcUp}</SelectItem>
                    <SelectItem value="down">{copy.text.arcDown}</SelectItem>
                  </SelectContent>
                </Select>
                <NumberField
                  label={copy.inspector.arcAmount}
                  value={arc.amount}
                  min={0}
                  max={1}
                  disabled={disabled}
                  testId="inspector-arc-amount"
                  onCommit={(value) => setArc({ ...arc, amount: value })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                data-testid="inspector-arc-straighten"
                disabled={disabled}
                onClick={() => patch({ type: 'text', arc: null })}
                className="h-8 w-full rounded-lg px-2 text-xs"
              >
                {copy.inspector.straighten}
              </Button>
            </div>
          )}
        </Field>
      </div>
    </Section>
  );
}

function ShapeSection({
  object,
  disabled,
  patch,
}: {
  object: ShapeObject;
  disabled: boolean;
  patch: Patch;
}) {
  const { copy } = useI18n();
  const hasStroke = object.stroke !== null;
  const isLine = object.shape === 'line';
  const sidesRange = object.shape === 'star' ? STAR_SIDES_RANGE : POLYGON_SIDES_RANGE;

  // Length of the segment over the box diagonal, scaled proportionally: the
  // angle survives and the box follows the new length.
  const setLength = (value: number) => {
    const current = Math.hypot(object.width, object.height);
    if (current <= 0) return;

    const factor = value / current;

    patch({
      type: 'shape',
      width: Math.max(1, round2(object.width * factor)),
      height: Math.max(1, round2(object.height * factor)),
    });
  };

  return (
    <Section title={copy.inspector.paint}>
      <div className="space-y-2">
        {!isLine && (
          <Field label={copy.inspector.fill}>
            <div data-testid="inspector-fill">
              <ColorField
                label={copy.inspector.fill}
                value={object.fill}
                disabled={disabled}
                onChange={(color) => patch({ type: 'shape', fill: color })}
              />
            </div>
          </Field>
        )}

        <Field label={copy.inspector.stroke}>
          {isLine ? (
            // A segment has no fill: its stroke is the paint, so the color is
            // always there — an off state would simply erase the shape.
            <div className="min-w-0" data-testid="inspector-stroke">
              <ColorField
                label={copy.inspector.stroke}
                value={object.stroke ?? object.fill}
                disabled={disabled}
                onChange={(color) => patch({ type: 'shape', stroke: color })}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={hasStroke}
                disabled={disabled}
                aria-label={copy.inspector.stroke}
                data-testid="inspector-stroke-toggle"
                onCheckedChange={(checked) =>
                  patch(
                    checked
                      ? {
                          type: 'shape',
                          stroke: object.stroke ?? '#111111',
                          strokeWidth: Math.max(1, object.strokeWidth),
                        }
                      : { type: 'shape', stroke: null },
                  )
                }
              />
              {object.stroke !== null && (
                <div className="min-w-0 flex-1" data-testid="inspector-stroke">
                  <ColorField
                    label={copy.inspector.stroke}
                    value={object.stroke}
                    disabled={disabled}
                    onChange={(color) => patch({ type: 'shape', stroke: color })}
                  />
                </div>
              )}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={copy.inspector.strokeWidth}>
            <NumberField
              label={copy.inspector.strokeWidth}
              value={object.strokeWidth}
              min={isLine ? 1 : 0}
              disabled={disabled || (!hasStroke && !isLine)}
              testId="inspector-stroke-width"
              onCommit={(value) => patch({ type: 'shape', strokeWidth: value })}
            />
          </Field>
          {object.shape === 'rect' && (
            <Field label={copy.inspector.cornerRadius}>
              <NumberField
                label={copy.inspector.cornerRadius}
                value={object.cornerRadius}
                min={0}
                disabled={disabled}
                testId="inspector-corner-radius"
                onCommit={(value) => patch({ type: 'shape', cornerRadius: value })}
              />
            </Field>
          )}
          {(object.shape === 'star' || object.shape === 'polygon') && (
            <Field label={copy.inspector.sides}>
              <NumberField
                label={copy.inspector.sides}
                value={object.sides}
                min={sidesRange.min}
                max={sidesRange.max}
                disabled={disabled}
                testId="inspector-sides"
                onCommit={(value) => patch({ type: 'shape', sides: Math.round(value) })}
              />
            </Field>
          )}
          {object.shape === 'star' && (
            <Field label={copy.inspector.innerRadius}>
              <NumberField
                label={copy.inspector.innerRadius}
                value={Math.round(object.innerRadius * 100)}
                min={Math.round(STAR_INNER_RADIUS_RANGE.min * 100)}
                max={Math.round(STAR_INNER_RADIUS_RANGE.max * 100)}
                disabled={disabled}
                testId="inspector-inner-radius"
                onCommit={(value) => patch({ type: 'shape', innerRadius: value / 100 })}
              />
            </Field>
          )}
          {isLine && (
            <Field label={copy.inspector.length}>
              <NumberField
                label={copy.inspector.length}
                value={Math.round(Math.hypot(object.width, object.height))}
                min={1}
                disabled={disabled}
                testId="inspector-length"
                onCommit={setLength}
              />
            </Field>
          )}
        </div>
      </div>
    </Section>
  );
}

function ImageSection({
  object,
  disabled,
  patch,
}: {
  object: ImageObject;
  disabled: boolean;
  patch: Patch;
}) {
  const { copy } = useI18n();

  return (
    <Section title={copy.inspector.image}>
      <Field label={copy.inspector.fit}>
        <Select
          value={object.fit}
          disabled={disabled}
          onValueChange={(value) => patch({ type: 'image', fit: value as ImageFit })}
        >
          <SelectTrigger
            aria-label={copy.inspector.fit}
            data-testid="inspector-fit"
            className="h-8 rounded-lg"
          >
            <SelectValue placeholder={copy.inspector.fit} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">{copy.controls.fitContain}</SelectItem>
            <SelectItem value="cover">{copy.controls.fitCover}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/*
        Read-only status: the mask is applied and cleared from the canvas menu,
        so the inspector reflects the document instead of offering a second
        control path (and never shows a state the document does not hold).
      */}
      <Field label={copy.inspector.mask}>
        <p
          data-testid="inspector-mask-state"
          data-mask={object.mask ?? 'none'}
          className="rounded-[0.7rem] bg-[hsl(var(--surface-muted))/0.6] px-2 py-1 text-[11px] text-[hsl(var(--text-muted))]"
        >
          {object.mask === null ? copy.inspector.maskNone : copy.inspector.maskRounded}
        </p>
      </Field>
    </Section>
  );
}

export function ObjectInspector({ object }: { object: DocumentObject }) {
  const { copy } = useI18n();
  const updateObject = useStore((state) => state.updateObject);
  const locked = object.locked;
  const patch: Patch = (next) => updateObject(object.id, next);
  // Shared fields (name, geometry, flags) exist on every type: the patch takes
  // the discriminant from the object being edited.
  const patchFields = (fields: CommonObjectFields) => patch(objectPatch(object.type, fields));

  return (
    <div className="mt-2 space-y-4" data-object-type={object.type}>
      <div className="flex items-center gap-1">
        <input
          type="text"
          aria-label={copy.inspector.name}
          data-testid="inspector-name"
          value={object.name}
          disabled={locked}
          onChange={(event) => patchFields({ name: event.target.value })}
          className="h-8 min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-2 text-xs font-medium text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <IconButton
          label={object.visible ? copy.canvas.hideObject : copy.canvas.showObject}
          testId="inspector-visible"
          pressed={!object.visible}
          onClick={() => patchFields({ visible: !object.visible })}
        >
          {object.visible ? <RuneEyeIcon className="h-4 w-4" /> : <RuneEyeOffIcon className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label={object.locked ? copy.canvas.unlockObject : copy.canvas.lockObject}
          testId="inspector-lock"
          pressed={object.locked}
          onClick={() => patchFields({ locked: !object.locked })}
        >
          {object.locked ? <RuneLockIcon className="h-4 w-4" /> : <RuneLockOpenIcon className="h-4 w-4" />}
        </IconButton>
      </div>

      {locked && (
        <p
          data-testid="inspector-locked-note"
          className="rounded-[0.7rem] bg-[hsl(var(--surface-muted))/0.6] px-2 py-1 text-[11px] text-[hsl(var(--text-muted))]"
        >
          {copy.inspector.locked}
        </p>
      )}

      <Section title={copy.inspector.position}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <NumberField
              label="X"
              value={object.x}
              disabled={locked}
              testId="inspector-x"
              onCommit={(value) => patchFields({ x: value })}
            />
          </Field>
          <Field label="Y">
            <NumberField
              label="Y"
              value={object.y}
              disabled={locked}
              testId="inspector-y"
              onCommit={(value) => patchFields({ y: value })}
            />
          </Field>
        </div>
      </Section>

      <Section title={copy.inspector.size}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={copy.inspector.width}>
            <NumberField
              label={copy.inspector.width}
              value={object.width}
              min={1}
              disabled={locked}
              testId="inspector-width"
              onCommit={(value) => patchFields({ width: value })}
            />
          </Field>
          {object.type !== 'text' && (
            <Field label={copy.inspector.height}>
              <NumberField
                label={copy.inspector.height}
                value={object.height}
                min={1}
                disabled={locked}
                testId="inspector-height"
                onCommit={(value) => patchFields({ height: value })}
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title={copy.inspector.appearance}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={copy.inspector.rotation}>
            <NumberField
              label={copy.inspector.rotation}
              value={object.rotation}
              disabled={locked}
              testId="inspector-rotation"
              onCommit={(value) => patchFields({ rotation: value })}
            />
          </Field>
          <Field label={copy.inspector.opacity}>
            <NumberField
              label={copy.inspector.opacity}
              value={Math.round(object.opacity * 100)}
              min={0}
              max={100}
              disabled={locked}
              testId="inspector-opacity"
              onCommit={(value) => patchFields({ opacity: value / 100 })}
            />
          </Field>
        </div>
      </Section>

      {object.type === 'text' && <TextSection object={object} disabled={locked} patch={patch} />}
      {object.type === 'shape' && <ShapeSection object={object} disabled={locked} patch={patch} />}
      {object.type === 'image' && <ImageSection object={object} disabled={locked} patch={patch} />}
    </div>
  );
}
