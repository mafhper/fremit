import type {
  DevicePreset,
  FrameFamily,
  FrameOrientation,
  ViewportPreset,
} from '@/types/app';

interface Size {
  width: number;
  height: number;
}

export const viewportPresetLabels: Record<ViewportPreset, string> = {
  desktop: 'Desktop',
  laptop: 'Laptop',
  tablet: 'Tablet',
  mobile: 'Mobile',
  custom: 'Custom',
};

export const desktopPresetSizes: Record<Exclude<ViewportPreset, 'custom'>, Size> = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 430, height: 932 },
};

export const devicePresetLabels: Record<DevicePreset, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
};

const phoneSizes: Record<FrameOrientation, Size> = {
  portrait: { width: 390, height: 844 },
  landscape: { width: 844, height: 390 },
};

const tabletSizes: Record<FrameOrientation, Size> = {
  portrait: { width: 820, height: 1180 },
  landscape: { width: 1180, height: 820 },
};

export function getViewportSize(
  family: FrameFamily,
  viewportPreset: ViewportPreset,
  devicePreset: DevicePreset,
  orientation: FrameOrientation,
  current: Size,
): Size {
  if (viewportPreset === 'custom') {
    return current;
  }

  if (family === 'desktop-browser') {
    return desktopPresetSizes[viewportPreset];
  }

  return devicePreset === 'phone' ? phoneSizes[orientation] : tabletSizes[orientation];
}
