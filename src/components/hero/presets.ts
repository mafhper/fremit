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
  speed: 0.55,
  warp: 0.75,
  ripple: 0.55,
  chrome: 0.70,
  contrast: 0.75,
  grain: 0.04,
  clouds: 0.6,
  centerX: 0.58,
  centerY: 0.34,
  centerSize: 1.32,
  pointer: true,
  colorA: '#ffffff',
  colorB: '#dbeafe',
  colorC: '#3b82f6',
};

export const darkPreset: LiquidMeshPreset = {
  speed: 0.55,
  warp: 0.85,
  ripple: 0.60,
  chrome: 0.85,
  contrast: 0.80,
  grain: 0.06,
  clouds: 0.65,
  centerX: 0.58,
  centerY: 0.34,
  centerSize: 1.32,
  pointer: true,
  colorA: '#000000',
  colorB: '#1e3a5f',
  colorC: '#38bdf8',
};
