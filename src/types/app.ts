export type SourceMode = 'upload' | 'clipboard-image' | 'image-url' | 'website-url';
export type SourceStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SourceStrategy =
  | 'direct-image'
  | 'microlink-screenshot'
  | 'og-image'
  | 'manual-fallback';

export type FrameFamily = 'desktop-browser' | 'device-frame';
export type DesktopChromePreset = 'mac' | 'win' | 'minimal' | 'none';
export type DevicePreset = 'phone' | 'tablet';
export type FrameOrientation = 'portrait' | 'landscape';
export type ViewportPreset = 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'custom';
export type ShadowSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type BackgroundType = 'solid' | 'gradient' | 'image';
export type FitMode = 'contain' | 'cover';
export type ExportFormat = 'png' | 'jpeg';
export type ExportScale = 1 | 2 | 3;

export interface ResolvedSource {
  mode: SourceMode;
  strategy: SourceStrategy;
  sourceUrl: string | null;
  resolvedImageUrl: string;
  title: string;
  requestedViewportWidth: number | null;
  requestedViewportHeight: number | null;
  status: Extract<SourceStatus, 'ready'>;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SourceState {
  draftUrl: string;
  status: SourceStatus;
  active: ResolvedSource | null;
  pendingMode: SourceMode | null;
  pendingUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface FrameState {
  family: FrameFamily;
  desktopChromePreset: DesktopChromePreset;
  devicePreset: DevicePreset;
  orientation: FrameOrientation;
  viewportPreset: ViewportPreset;
  windowShadow: ShadowSize;
  windowRadius: number;
  darkMode: boolean;
  showTitle: boolean;
  windowTitle: string;
  windowWidth: number;
  windowHeight: number;
  fitMode: FitMode;
  showDeviceCamera: boolean;
}

export interface BackgroundState {
  bgType: BackgroundType;
  bgColor: string;
  bgGradient: string;
  bgGradientType: 'linear' | 'radial';
  bgGradientDirection: number;
  bgImage: string | null;
  padding: number;
}

export interface ExportState {
  format: ExportFormat;
  scale: ExportScale;
}

export type ThemePreference = 'light' | 'dark';

export interface AppShellState {
  themePreference: ThemePreference;
}
