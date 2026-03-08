import type { ResolvedSource, SourceMode, SourceStrategy } from '@/types/app';

interface ResolveViewportOptions {
  viewportWidth?: number | null;
  viewportHeight?: number | null;
}

export class SourceResolutionError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SourceResolutionError';
    this.code = code;
  }
}

const imageExtensionPattern = /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

export function detectSourceMode(input: string): SourceMode {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new SourceResolutionError('empty-input', 'Provide a website or image URL.');
  }

  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:') || imageExtensionPattern.test(trimmed)) {
    return 'image-url';
  }

  return 'website-url';
}

export function getUrlTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\/$/, '').replace(/\/$/, '');
    return pathname ? `${urlObj.hostname}${pathname}` : urlObj.hostname;
  } catch {
    return 'Imported preview';
  }
}

function ensureValidUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    throw new SourceResolutionError('invalid-url', 'This URL is not valid.');
  }
}

function preloadImage(url: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(url);
        return;
      }

      reject(new SourceResolutionError('image-load-failed', 'The preview image could not be loaded.'));
    };
    image.onerror = () =>
      reject(new SourceResolutionError('image-load-failed', 'The preview image could not be loaded.'));
    image.src = url;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(
        new SourceResolutionError(
          'image-read-failed',
          'The preview image could not be prepared for export. Use upload or paste instead.',
        ),
      );
    reader.readAsDataURL(blob);
  });
}

async function fetchExportableImage(url: string) {
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return preloadImage(url);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'omit',
      mode: 'cors',
    });
  } catch {
    throw new SourceResolutionError(
      'image-fetch-failed',
      'This image URL could not be prepared for export. Use upload or paste instead.',
    );
  }

  if (!response.ok) {
    throw new SourceResolutionError(
      'image-fetch-failed',
      'This image URL could not be prepared for export. Use upload or paste instead.',
    );
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return preloadImage(dataUrl);
}

async function resolveLoadedImage(
  imageUrl: string,
  mode: SourceMode,
  strategy: SourceStrategy,
  title: string,
  options: ResolveViewportOptions = {},
  sourceUrl: string | null = imageUrl,
) {
  const resolvedImageUrl = await fetchExportableImage(imageUrl);
  const resolved: ResolvedSource = {
    mode,
    strategy,
    sourceUrl,
    resolvedImageUrl,
    title,
    requestedViewportWidth: options.viewportWidth ?? null,
    requestedViewportHeight: options.viewportHeight ?? null,
    status: 'ready',
    errorCode: null,
    errorMessage: null,
  };

  return resolved;
}

export async function resolveImageUrl(url: string) {
  ensureValidUrl(url);
  return resolveLoadedImage(url, 'image-url', 'direct-image', getUrlTitle(url), {}, url);
}

function buildMicrolinkUrl(url: string, options: ResolveViewportOptions = {}) {
  const params = new URLSearchParams({
    url,
    screenshot: 'true',
    meta: 'false',
    'screenshot.fullPage': 'false',
  });

  if (options.viewportWidth) {
    params.set('viewport.width', String(options.viewportWidth));
  }

  if (options.viewportHeight) {
    params.set('viewport.height', String(options.viewportHeight));
  }

  return `https://api.microlink.io/?${params.toString()}`;
}

export async function resolveWebsiteUrl(url: string, options: ResolveViewportOptions = {}) {
  ensureValidUrl(url);

  let response: Response;
  try {
    response = await fetch(buildMicrolinkUrl(url, options));
  } catch {
    throw new SourceResolutionError(
      'microlink-network',
      'Microlink could not be reached. Try a manual screenshot instead.',
    );
  }

  if (!response.ok) {
    throw new SourceResolutionError(
      'microlink-http',
      'Microlink did not return a valid preview for this website.',
    );
  }

  const payload = await response.json();
  if (payload.status !== 'success' || !payload.data) {
    throw new SourceResolutionError('microlink-failed', 'No preview metadata was returned for this website.');
  }

  const title = payload.data.title || getUrlTitle(url);

  if (payload.data.screenshot?.url) {
    return resolveLoadedImage(
      payload.data.screenshot.url,
      'website-url',
      'microlink-screenshot',
      title,
      options,
      url,
    );
  }

  if (payload.data.image?.url) {
    return resolveLoadedImage(payload.data.image.url, 'website-url', 'og-image', title, options, url);
  }

  throw new SourceResolutionError(
    'no-preview',
    'This website did not expose a screenshot or Open Graph image. Use a screenshot instead.',
  );
}

export async function fileToDataUrl(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new SourceResolutionError('invalid-file', 'Only image files are supported.');
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new SourceResolutionError('file-read-failed', 'The image file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function resolveFileSource(file: File, mode: Extract<SourceMode, 'upload' | 'clipboard-image'>) {
  const dataUrl = await fileToDataUrl(file);
  const resolvedImageUrl = await preloadImage(dataUrl);

  const resolved: ResolvedSource = {
    mode,
    strategy: 'direct-image',
    sourceUrl: null,
    resolvedImageUrl,
    title: file.name || 'Imported image',
    requestedViewportWidth: null,
    requestedViewportHeight: null,
    status: 'ready',
    errorCode: null,
    errorMessage: null,
  };

  return resolved;
}

export async function resolveSourceFromUrl(input: string, options: ResolveViewportOptions = {}) {
  const trimmed = input.trim();
  const mode = detectSourceMode(trimmed);

  if (mode === 'image-url') {
    return resolveImageUrl(trimmed);
  }

  return resolveWebsiteUrl(trimmed, options);
}
