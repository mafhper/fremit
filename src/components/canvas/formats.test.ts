/**
 * formats.test.ts
 * Cobre proporções, validação de imagem e conversão de medidas da tela para o arquivo exportado.
 */
import { describe, expect, it } from 'vitest';
import {
  ARTBOARD_FORMATS,
  CHROME_HEIGHT,
  MAX_IMAGE_BYTES,
  aspectRatio,
  computeExportLayout,
  formatDimensions,
  getArtboardFormat,
  isAcceptedImage,
} from './formats';

describe('formatos', () => {
  it('expõe os cinco formatos esperados, com ids únicos', () => {
    const ids = ARTBOARD_FORMATS.map((format) => format.id);
    expect(ids).toEqual(['hero', 'banner', 'post', 'story', 'poster']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('calcula proporção e legenda de dimensões', () => {
    expect(aspectRatio(getArtboardFormat('hero'))).toBeCloseTo(16 / 9);
    expect(aspectRatio(getArtboardFormat('banner'))).toBeCloseTo(3);
    expect(aspectRatio(getArtboardFormat('post'))).toBe(1);
    expect(aspectRatio(getArtboardFormat('story'))).toBeCloseTo(9 / 16);
    expect(formatDimensions(getArtboardFormat('poster'))).toBe('1800 × 2400');
  });
});

describe('isAcceptedImage', () => {
  it('aceita imagens dentro do limite', () => {
    expect(isAcceptedImage({ type: 'image/png', size: 1024 })).toBe(true);
    expect(isAcceptedImage({ type: 'image/svg+xml', size: MAX_IMAGE_BYTES })).toBe(true);
  });

  it('rejeita tipos não imagem, arquivos vazios e acima do limite', () => {
    expect(isAcceptedImage({ type: 'application/pdf', size: 1024 })).toBe(false);
    expect(isAcceptedImage({ type: 'image/png', size: 0 })).toBe(false);
    expect(isAcceptedImage({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toBe(false);
    expect(isAcceptedImage({ type: 'image/png', size: 2048 }, 1024)).toBe(false);
  });
});

describe('computeExportLayout', () => {
  const hero = getArtboardFormat('hero');
  const artboard = { left: 100, top: 50, width: 960, height: 540 };

  it('escala as medidas da tela para o tamanho do arquivo', () => {
    const device = { left: 220, top: 110, width: 720, height: 420 };
    const layout = computeExportLayout(hero, artboard, device);

    expect(layout).not.toBeNull();
    expect(layout?.scale).toBe(2);
    expect(layout?.canvas).toEqual({ width: 1920, height: 1080 });
    expect(layout?.device).toEqual({ x: 240, y: 120, width: 1440, height: 840 });
    expect(layout?.titleBarHeight).toBe(CHROME_HEIGHT * 2);
  });

  it('mantém a proporção do formato em qualquer largura de prancheta', () => {
    const story = getArtboardFormat('story');
    const narrow = { left: 0, top: 0, width: 270, height: 480 };
    const layout = computeExportLayout(story, narrow, { left: 27, top: 90, width: 216, height: 300 });

    expect(layout?.scale).toBe(4);
    expect(layout?.device.x).toBe(108);
    expect(layout?.canvas.height / (layout?.canvas.width ?? 1)).toBeCloseTo(16 / 9);
  });

  it('retorna null quando a prancheta não tem largura', () => {
    expect(computeExportLayout(hero, { ...artboard, width: 0 }, artboard)).toBeNull();
  });
});
