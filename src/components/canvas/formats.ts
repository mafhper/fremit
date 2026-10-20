/**
 * formats.ts
 * Formatos da prancheta (canvas), validação de imagens e geometria da exportação.
 * Funções puras: não dependem de DOM, o que facilita os testes.
 */

export type ArtboardFormatId = 'hero' | 'banner' | 'post' | 'story' | 'poster';

export interface ArtboardFormat {
  id: ArtboardFormatId;
  width: number;
  height: number;
}

export const ARTBOARD_FORMATS: readonly ArtboardFormat[] = [
  { id: 'hero', width: 1920, height: 1080 },
  { id: 'banner', width: 1500, height: 500 },
  { id: 'post', width: 1080, height: 1080 },
  { id: 'story', width: 1080, height: 1920 },
  { id: 'poster', width: 1800, height: 2400 },
];

export const DEFAULT_ARTBOARD_FORMAT: ArtboardFormatId = 'hero';

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export function getArtboardFormat(id: ArtboardFormatId): ArtboardFormat {
  return ARTBOARD_FORMATS.find((format) => format.id === id) ?? ARTBOARD_FORMATS[0];
}

export function aspectRatio(format: Pick<ArtboardFormat, 'width' | 'height'>): number {
  return format.width / format.height;
}

export function formatDimensions(format: Pick<ArtboardFormat, 'width' | 'height'>): string {
  return `${format.width} × ${format.height}`;
}

export function isAcceptedImage(
  file: { type: string; size: number },
  maxBytes: number = MAX_IMAGE_BYTES,
): boolean {
  return file.type.startsWith('image/') && file.size > 0 && file.size <= maxBytes;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ExportLayout {
  canvas: { width: number; height: number };
  scale: number;
  device: { x: number; y: number; width: number; height: number };
  titleBarHeight: number;
  radius: number;
}

export const CHROME_HEIGHT = 26;
export const DEVICE_RADIUS = 10;

/**
 * Converte as medidas da tela (px CSS) em coordenadas do arquivo exportado.
 * Retorna null quando a prancheta não tem largura (ex.: oculta), pois não há escala válida.
 */
export function computeExportLayout(
  format: Pick<ArtboardFormat, 'width' | 'height'>,
  artboard: Box,
  device: Box,
): ExportLayout | null {
  if (!(artboard.width > 0)) return null;

  const scale = format.width / artboard.width;
  return {
    canvas: { width: format.width, height: format.height },
    scale,
    device: {
      x: (device.left - artboard.left) * scale,
      y: (device.top - artboard.top) * scale,
      width: device.width * scale,
      height: device.height * scale,
    },
    titleBarHeight: CHROME_HEIGHT * scale,
    radius: DEVICE_RADIUS * scale,
  };
}
