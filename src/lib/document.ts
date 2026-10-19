/**
 * Documento JSON — the serializable contract for the dedicated editor canvas.
 *
 * The document is plain JSON: no classes, no functions, no `undefined` values.
 * Every field is required, so a serialized document always parses back to an
 * equal value — a round-trip without loss is the acceptance criterion for this
 * contract.
 *
 * Layer model: each page holds `objects` in z-order — index 0 is the bottom
 * (back) layer and the last object is the top (front) layer. The layers panel
 * derives its rows from this array; `visible` and `locked` live on the object,
 * so visibility and locking survive a save/load cycle.
 *
 * The contract is engine-agnostic: it describes *what* to render, not *how*.
 * The canvas engine and the exporter both consume this module, never the other
 * way around, and the schema stays valid if the engine ever changes.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { DEFAULT_PAGE_COLOR, parsePageBackground } from '@/lib/pageBackground';
import { isRecord } from '@/lib/guards';

export const DOCUMENT_SCHEMA_VERSION = 2;

/** Schema versions `parseDocument` understands; older ones are migrated on load. */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, DOCUMENT_SCHEMA_VERSION];

export type TextAlign = 'left' | 'center' | 'right';
export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'line' | 'star' | 'polygon';
export type ImageFit = 'contain' | 'cover';

/**
 * Clip presets of an image object. The contract stores the preset id, never a
 * radius: the radius is a ratio of the shorter side (see `src/lib/imageMask`),
 * so scaling the object can never rewrite the mask.
 */
export const IMAGE_MASK_PRESETS = ['rounded'] as const;

export type ImageMaskPreset = (typeof IMAGE_MASK_PRESETS)[number];

/**
 * Canonical shape kinds; the parser validates against this exact list. The
 * geometry of each kind lives in `src/lib/shapeGeometry` (canvas, export and
 * thumbnails all measure from there).
 */
export const SHAPE_KINDS: readonly ShapeKind[] = [
  'rect',
  'ellipse',
  'triangle',
  'line',
  'star',
  'polygon',
];

/** Bounds of `sides` (star points / polygon sides) the schema accepts. */
export const SHAPE_SIDES_MIN = 3;
export const SHAPE_SIDES_MAX = 16;
/** Bounds of `innerRadius` (a ratio of the star's outer radius). */
export const SHAPE_INNER_RADIUS_MIN = 0;
export const SHAPE_INNER_RADIUS_MAX = 1;
/**
 * Fallbacks for a v2 writer that omits the star/polygon parameters — the same
 * tolerance `arc` and `animation` get. The defaults are inert on the kinds
 * that do not use them.
 */
export const DEFAULT_SHAPE_SIDES = 5;
export const DEFAULT_SHAPE_INNER_RADIUS = 0.5;

export type ArcDirection = 'up' | 'down';

/** Where an entrance effect comes from (slide/wipe origin, flip hinge side). */
export type AnimationDirection = 'up' | 'down' | 'left' | 'right';

/** Easing of an animation timeline; `backOut` is the overshoot of `pop`/`spin`. */
export type AnimationEasing = 'linear' | 'easeOut' | 'easeInOut' | 'backOut';

/**
 * Entrance presets for one object (the Element section of the animate panel).
 * `words` and `typewriter` reveal stepped by word/character; the rest are
 * continuous.
 */
export type ElementAnimationPreset =
  | 'fade'
  | 'rise'
  | 'pop'
  | 'slide'
  | 'words'
  | 'typewriter'
  | 'wipe'
  | 'focus';

/**
 * Page transitions of the schema (the Page section). "None" is `transition:
 * null`, not a preset id — a page without a transition carries no object.
 */
export type PageTransitionPreset =
  | 'fade'
  | 'dip'
  | 'dissolve'
  | 'blur'
  | 'slide'
  | 'push'
  | 'cover'
  | 'uncover'
  | 'zoom'
  | 'wipe'
  | 'circle'
  | 'flip'
  | 'spin'
  | 'blinds';

/** Canonical preset ids; the parser validates against these exact lists. */
export const ELEMENT_ANIMATION_PRESETS: readonly ElementAnimationPreset[] = [
  'fade',
  'rise',
  'pop',
  'slide',
  'words',
  'typewriter',
  'wipe',
  'focus',
];

export const PAGE_TRANSITION_PRESETS: readonly PageTransitionPreset[] = [
  'fade',
  'dip',
  'dissolve',
  'blur',
  'slide',
  'push',
  'cover',
  'uncover',
  'zoom',
  'wipe',
  'circle',
  'flip',
  'spin',
  'blinds',
];

export const ANIMATION_EASINGS: readonly AnimationEasing[] = [
  'linear',
  'easeOut',
  'easeInOut',
  'backOut',
];

export const ANIMATION_DIRECTIONS: readonly AnimationDirection[] = ['up', 'down', 'left', 'right'];

/** Timeline bounds of the schema, in milliseconds. */
export const MIN_ANIMATION_DURATION_MS = 100;
export const MAX_ANIMATION_DURATION_MS = 10000;
/** Fallback for controls without a stored animation yet. */
export const DEFAULT_ANIMATION_DURATION_MS = 600;

/**
 * Per-object entrance animation (schema v2). The player lives behind a lazy
 * chunk; a build without it still reads and writes the field — it simply does
 * not play it.
 */
export interface ObjectAnimation {
  preset: ElementAnimationPreset;
  durationMs: number;
  easing: AnimationEasing;
  direction: AnimationDirection;
}

/** Per-page transition (schema v2). `null` on the page means "None". */
export interface PageTransition {
  preset: PageTransitionPreset;
  durationMs: number;
  easing: AnimationEasing;
  direction: AnimationDirection;
}

/**
 * Curved text (schema v2): the text follows a circular arc instead of a
 * straight baseline. `amount` is the curvature in 0..1 — the editor clamps it
 * to a usable minimum, and 1 is the maximum sweep it allows. The arc path is
 * derived from the text, the font and this pair at render time, so the curve
 * stays a property of the text.
 */
export interface TextArc {
  direction: ArcDirection;
  amount: number;
}

export interface SolidPageBackground {
  kind: 'solid';
  color: string;
}

/** Linear gradient; `angle` follows the CSS convention (0deg points up). */
export interface GradientPageBackground {
  kind: 'gradient';
  from: string;
  to: string;
  angle: number;
}

/** Image page fill, always rendered with cover semantics. */
export interface ImagePageBackground {
  kind: 'image';
  src: string;
}

export type PageBackground =
  | SolidPageBackground
  | GradientPageBackground
  | ImagePageBackground;

export interface DocumentObjectBase {
  id: string;
  /** Layer label shown in the layers panel. */
  name: string;
  /** Position and size in page pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in degrees. */
  rotation: number;
  /** 0..1. */
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Entrance animation (schema v2); `null` is a static object. */
  animation: ObjectAnimation | null;
}

export interface TextObject extends DocumentObjectBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  align: TextAlign;
  /** Curved baseline (schema v2); `null` is the straight text of v1. */
  arc: TextArc | null;
}

export interface ShapeObject extends DocumentObjectBase {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  /** Corner radius in pixels; applies to `rect`. */
  cornerRadius: number;
}

export interface ImageObject extends DocumentObjectBase {
  type: 'image';
  /**
   * Data URL or absolute URL. `src/lib/sourceResolver` already resolves every
   * capture to a data URL, which keeps the document self-contained.
   */
  src: string;
  fit: ImageFit;
}

export type DocumentObject = TextObject | ShapeObject | ImageObject;

export interface DocumentPage {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Solid color, linear gradient or image (schema v2). */
  background: PageBackground;
  /** Page transition (schema v2); `null` is "None". */
  transition: PageTransition | null;
  /** Z-order: index 0 is the bottom layer. */
  objects: DocumentObject[];
}

export interface FremitDocument {
  schemaVersion: typeof DOCUMENT_SCHEMA_VERSION;
  pages: DocumentPage[];
}

export type DocumentParseErrorCode =
  | 'invalid-json'
  | 'unsupported-version'
  | 'invalid-structure'
  | 'unknown-object-type';

export class DocumentParseError extends Error {
  readonly code: DocumentParseErrorCode;

  constructor(code: DocumentParseErrorCode, message: string) {
    super(message);
    this.name = 'DocumentParseError';
    this.code = code;
  }
}

function newId(): string {
  return crypto.randomUUID();
}

export function createPage(overrides: Partial<Omit<DocumentPage, 'objects'>> = {}): DocumentPage {
  return {
    id: newId(),
    name: 'Page 1',
    width: 1080,
    height: 1080,
    background: { kind: 'solid', color: DEFAULT_PAGE_COLOR },
    transition: null,
    objects: [],
    ...overrides,
  };
}

export function createDocument(pages: DocumentPage[] = [createPage()]): FremitDocument {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    pages,
  };
}

export function createTextObject(
  text: string,
  overrides: Partial<Omit<TextObject, 'type'>> = {},
): TextObject {
  return {
    type: 'text',
    id: newId(),
    name: 'Text',
    x: 0,
    y: 0,
    width: 480,
    height: 120,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    text,
    fontFamily: 'Inter, sans-serif',
    fontSize: 48,
    fontWeight: 600,
    fill: '#111111',
    align: 'left',
    arc: null,
    animation: null,
    ...overrides,
  };
}

export function createShapeObject(
  shape: ShapeKind = 'rect',
  overrides: Partial<Omit<ShapeObject, 'type'>> = {},
): ShapeObject {
  return {
    type: 'shape',
    id: newId(),
    name: 'Shape',
    x: 0,
    y: 0,
    width: 320,
    height: 320,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    shape,
    fill: '#1f6feb',
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
    ...overrides,
  };
}

export function createImageObject(
  src: string,
  overrides: Partial<Omit<ImageObject, 'type'>> = {},
): ImageObject {
  return {
    type: 'image',
    id: newId(),
    name: 'Image',
    x: 0,
    y: 0,
    width: 640,
    height: 360,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    src,
    fit: 'contain',
    ...overrides,
  };
}

/**
 * Serializes the document to the JSON text that is saved and reloaded.
 * `parseDocument` is the only counterpart: every load path goes through it.
 */
export function serializeDocument(document: FremitDocument): string {
  return JSON.stringify(document);
}

function throwParseError(message: string, code: DocumentParseErrorCode = 'invalid-structure'): never {
  throw new DocumentParseError(code, message);
}

function readString(source: Record<string, unknown>, key: string, where: string): string {
  const value = source[key];
  if (typeof value !== 'string') {
    throwParseError(`${where}.${key} must be a string`);
  }
  return value;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  where: string,
  bounds: { min?: number; max?: number } = {},
): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwParseError(`${where}.${key} must be a finite number`);
  }
  if (bounds.min !== undefined && value < bounds.min) {
    throwParseError(`${where}.${key} must be >= ${bounds.min}`);
  }
  if (bounds.max !== undefined && value > bounds.max) {
    throwParseError(`${where}.${key} must be <= ${bounds.max}`);
  }
  return value;
}

function readBoolean(source: Record<string, unknown>, key: string, where: string): boolean {
  const value = source[key];
  if (typeof value !== 'boolean') {
    throwParseError(`${where}.${key} must be a boolean`);
  }
  return value;
}

function readObjectBase(
  source: Record<string, unknown>,
  where: string,
): Omit<DocumentObjectBase, 'animation'> {
  return {
    id: readString(source, 'id', where),
    name: readString(source, 'name', where),
    x: readNumber(source, 'x', where),
    y: readNumber(source, 'y', where),
    width: readNumber(source, 'width', where, { min: 0 }),
    height: readNumber(source, 'height', where, { min: 0 }),
    rotation: readNumber(source, 'rotation', where),
    opacity: readNumber(source, 'opacity', where, { min: 0, max: 1 }),
    visible: readBoolean(source, 'visible', where),
    locked: readBoolean(source, 'locked', where),
  };
}

function parseArc(value: unknown, where: string): TextArc | null {
  if (value === null) return null;

  if (!isRecord(value)) {
    throwParseError(`${where}.arc must be an object or null`);
  }

  const direction = value.direction;
  if (direction !== 'up' && direction !== 'down') {
    throwParseError(`${where}.arc.direction must be up or down`);
  }

  return {
    direction,
    amount: readNumber(value, 'amount', `${where}.arc`, { min: 0, max: 1 }),
  };
}

function isElementAnimationPreset(value: unknown): value is ElementAnimationPreset {
  return typeof value === 'string' && (ELEMENT_ANIMATION_PRESETS as readonly string[]).includes(value);
}

function isPageTransitionPreset(value: unknown): value is PageTransitionPreset {
  return typeof value === 'string' && (PAGE_TRANSITION_PRESETS as readonly string[]).includes(value);
}

function parseAnimationEasing(value: unknown, where: string): AnimationEasing {
  if (typeof value !== 'string' || !(ANIMATION_EASINGS as readonly string[]).includes(value)) {
    throwParseError(`${where}.easing must be linear, easeOut, easeInOut or backOut`);
  }

  return value as AnimationEasing;
}

function parseAnimationDirection(value: unknown, where: string): AnimationDirection {
  if (typeof value !== 'string' || !(ANIMATION_DIRECTIONS as readonly string[]).includes(value)) {
    throwParseError(`${where}.direction must be up, down, left or right`);
  }

  return value as AnimationDirection;
}

function parseObjectAnimation(value: unknown, where: string): ObjectAnimation | null {
  if (value === null) return null;

  if (!isRecord(value)) {
    throwParseError(`${where}.animation must be an object or null`);
  }

  const preset = value.preset;
  if (!isElementAnimationPreset(preset)) {
    throwParseError(`${where}.animation.preset is not a known preset: ${String(preset)}`);
  }

  return {
    preset,
    durationMs: readNumber(value, 'durationMs', `${where}.animation`, {
      min: MIN_ANIMATION_DURATION_MS,
      max: MAX_ANIMATION_DURATION_MS,
    }),
    easing: parseAnimationEasing(value.easing, `${where}.animation`),
    direction: parseAnimationDirection(value.direction, `${where}.animation`),
  };
}

function parsePageTransition(value: unknown, where: string): PageTransition | null {
  if (value === null) return null;

  if (!isRecord(value)) {
    throwParseError(`${where}.transition must be an object or null`);
  }

  const preset = value.preset;
  if (!isPageTransitionPreset(preset)) {
    throwParseError(`${where}.transition.preset is not a known preset: ${String(preset)}`);
  }

  return {
    preset,
    durationMs: readNumber(value, 'durationMs', `${where}.transition`, {
      min: MIN_ANIMATION_DURATION_MS,
      max: MAX_ANIMATION_DURATION_MS,
    }),
    easing: parseAnimationEasing(value.easing, `${where}.transition`),
    direction: parseAnimationDirection(value.direction, `${where}.transition`),
  };
}

/**
 * Mask of an image object. A document written before the field existed (and a
 * v2 writer that omits it) reads as unmasked — the same tolerance `arc` and
 * `animation` get — while a present value must be a known preset.
 */
function parseImageMask(value: unknown, where: string): ImageMaskPreset | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string' && (IMAGE_MASK_PRESETS as readonly string[]).includes(value)) {
    return value as ImageMaskPreset;
  }

  throwParseError(`${where}.mask is not a known mask preset: ${String(value)}`);
}

function parseObject(value: unknown, where: string, version: number): DocumentObject {
  if (!isRecord(value)) {
    throwParseError(`${where} must be an object`);
  }

  const type = value.type;
  if (type !== 'text' && type !== 'shape' && type !== 'image') {
    throwParseError(`${where}.type is not a known object type: ${String(type)}`, 'unknown-object-type');
  }

  const base: DocumentObjectBase = {
    ...readObjectBase(value, where),
    // v1 has no animation, and a v2 writer that omits the field gets a static
    // object instead of a hard rejection — the same treatment as `arc`.
    animation:
      version === 1 || value.animation === undefined
        ? null
        : parseObjectAnimation(value.animation, where),
  };

  if (type === 'text') {
    const align = value.align;
    if (align !== 'left' && align !== 'center' && align !== 'right') {
      throwParseError(`${where}.align must be left, center or right`);
    }
    const fontSize = readNumber(value, 'fontSize', where, { min: 0 });
    if (fontSize === 0) {
      throwParseError(`${where}.fontSize must be > 0`);
    }
    return {
      ...base,
      type,
      text: readString(value, 'text', where),
      fontFamily: readString(value, 'fontFamily', where),
      fontSize,
      fontWeight: readNumber(value, 'fontWeight', where),
      fill: readString(value, 'fill', where),
      align,
    };
  }

  if (type === 'shape') {
    const shape = value.shape;
    if (shape !== 'rect' && shape !== 'ellipse') {
      throwParseError(`${where}.shape must be rect or ellipse`);
    }
    const stroke = value.stroke;
    if (stroke !== null && typeof stroke !== 'string') {
      throwParseError(`${where}.stroke must be a string or null`);
    }
    return {
      ...base,
      type,
      shape,
      fill: readString(value, 'fill', where),
      stroke,
      strokeWidth: readNumber(value, 'strokeWidth', where, { min: 0 }),
      cornerRadius: readNumber(value, 'cornerRadius', where, { min: 0 }),
    };
  }

  const fit = value.fit;
  if (fit !== 'contain' && fit !== 'cover') {
    throwParseError(`${where}.fit must be contain or cover`);
  }
  return {
    ...base,
    type,
    src: readString(value, 'src', where),
    fit,
  };
}

function parsePage(value: unknown, where: string): DocumentPage {
  if (!isRecord(value)) {
    throwParseError(`${where} must be an object`);
  }

  const objects = value.objects;
  if (!Array.isArray(objects)) {
    throwParseError(`${where}.objects must be an array`);
  }

  return {
    id: readString(value, 'id', where),
    name: readString(value, 'name', where),
    width: readNumber(value, 'width', where, { min: 1 }),
    height: readNumber(value, 'height', where, { min: 1 }),
    background: readString(value, 'background', where),
    objects: objects.map((object, index) => parseObject(object, `${where}.objects[${index}]`)),
  };
}

/**
 * Parses and validates the JSON text produced by `serializeDocument`.
 *
 * Unknown fields are ignored (the result is a validated copy of the known
 * contract); anything that does not match the schema throws
 * `DocumentParseError` with a machine-readable `code`.
 *
 * The parse is tolerant to older schema versions: a v1 document is migrated
 * on load (page color becomes a solid background, text gains `arc: null`) and
 * always comes back as a v2 document. The migration is one-way — v2 has no
 * path back to v1.
 */
export function parseDocument(input: string): FremitDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throwParseError('document is not valid JSON', 'invalid-json');
  }

  if (!isRecord(parsed)) {
    throwParseError('document must be a JSON object');
  }

  const version = parsed.schemaVersion;
  if (typeof version !== 'number' || !SUPPORTED_SCHEMA_VERSIONS.includes(version)) {
    throwParseError(`unsupported schemaVersion: ${String(version)}`, 'unsupported-version');
  }

  const pages = parsed.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    throwParseError('document must have at least one page');
  }

  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    pages: pages.map((page, index) => parsePage(page, `pages[${index}]`)),
  };
}
