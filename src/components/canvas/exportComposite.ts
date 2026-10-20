/**
 * exportComposite.ts
 * Compõe o PNG da prancheta: fundo (recorte do shader), moldura escura e imagem do usuário.
 * Usa as medidas de `computeExportLayout`, então o resultado espelha o que aparece na tela.
 */

import type { ExportLayout } from './formats';

export interface ComposeInput {
  layout: ExportLayout;
  /** Recorte do shader (ver LiquidMeshHandle.capture); null usa `fallbackColor`. */
  backdrop: CanvasImageSource | null;
  fallbackColor: string;
  image: CanvasImageSource;
  title: string;
}

const TRAFFIC_LIGHTS = ['#ff5f57', '#febc2e', '#28c840'] as const;

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function composeArtboardExport({
  layout,
  backdrop,
  fallbackColor,
  image,
  title,
}: ComposeInput): HTMLCanvasElement {
  const { canvas: size, scale: s, device: d, titleBarHeight: bar, radius } = layout;
  const out = document.createElement('canvas');
  out.width = size.width;
  out.height = size.height;

  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível neste ambiente.');

  if (backdrop) {
    ctx.drawImage(backdrop, 0, 0, size.width, size.height);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(0, 0, size.width, size.height);
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 50 * s;
  ctx.shadowOffsetY = 20 * s;
  ctx.fillStyle = '#0a0f18';
  roundedRectPath(ctx, d.x, d.y, d.width, d.height, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, d.x, d.y, d.width, d.height, radius);
  ctx.clip();
  ctx.drawImage(image, d.x, d.y + bar, d.width, d.height - bar);
  ctx.restore();

  TRAFFIC_LIGHTS.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(d.x + (15.5 + index * 16) * s, d.y + bar / 2, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#c9d0dc';
  ctx.font = `${11 * s}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(title, d.x + d.width / 2, d.y + bar / 2 + 4 * s);

  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem.'))), type);
  });
}
