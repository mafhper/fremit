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

export const DOCUMENT_SCHEMA_VERSION = 1;

export type TextAlign = 'left' | 'center' | 'right';
export type ShapeKind = 'rect' | 'ellipse';
export type ImageFit = 'contain' | 'cover';

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
}

export interface TextObject extends DocumentObjectBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  align: TextAlign;
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
  /** CSS color. */
  background: string;
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
    background: '#ffffff',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function readObjectBase(source: Record<string, unknown>, where: string): DocumentObjectBase {
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

function parseObject(value: unknown, where: string): DocumentObject {
  if (!isRecord(value)) {
    throwParseError(`${where} must be an object`);
  }

  const type = value.type;
  if (type !== 'text' && type !== 'shape' && type !== 'image') {
    throwParseError(`${where}.type is not a known object type: ${String(type)}`, 'unknown-object-type');
  }

  const base = readObjectBase(value, where);

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

  if (parsed.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
    throwParseError(`unsupported schemaVersion: ${String(parsed.schemaVersion)}`, 'unsupported-version');
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
