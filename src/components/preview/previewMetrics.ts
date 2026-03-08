import type { FrameState } from '@/types/app';

const desktopToolbarHeight = 44;

export function getDeviceMetrics(frame: FrameState) {
  const isPhone = frame.devicePreset === 'phone';
  return {
    bezel: isPhone ? 16 : 18,
    outerRadius: isPhone ? 36 : 30,
    innerRadius: isPhone ? 24 : 22,
  };
}

export function getFrameOuterSize(frame: FrameState) {
  if (frame.family === 'desktop-browser') {
    return {
      width: frame.windowWidth,
      height: frame.windowHeight + (frame.desktopChromePreset === 'none' ? 0 : desktopToolbarHeight),
    };
  }

  const metrics = getDeviceMetrics(frame);
  return {
    width: frame.windowWidth + metrics.bezel * 2,
    height: frame.windowHeight + metrics.bezel * 2,
  };
}
