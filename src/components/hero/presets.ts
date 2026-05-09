export interface LiquidMeshPreset {
  speed: number;
  warp: number;
  ripple: number;
  chrome: number;
  contrast: number;
  grain: number;
  clouds: number;
  centerX: number;
  centerY: number;
  centerSize: number;
  pointer: boolean;
  colorA: string;
  colorB: string;
  colorC: string;
}

export const lightPreset: LiquidMeshPreset = {
  speed: 0.2,
  warp: 0.58,
  ripple: 0.30,
  chrome: 0.52,
  contrast: 0.48,
  grain: 0.03,
  clouds: 0.5,
  centerX: 0.58,
  centerY: 0.34,
  centerSize: 1.32,
  pointer: true,
  colorA: '#ffffff',
  colorB: '#dbeafe',
  colorC: '#3b82f6',
};

export const darkPreset: LiquidMeshPreset = {
  speed: 0.28,
  warp: 0.72,
  ripple: 0.42,
  chrome: 0.78,
  contrast: 0.66,
  grain: 0.06,
  clouds: 0.6,
  centerX: 0.58,
  centerY: 0.34,
  centerSize: 1.32,
  pointer: true,
  colorA: '#000000',
  colorB: '#1e3a5f',
  colorC: '#38bdf8',
};
