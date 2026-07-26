import { create } from 'zustand';
import { getViewportSize } from '@/lib/framePresets';
import type {
  AppShellState,
  BackgroundState,
  CaptureDelay,
  DesktopChromePreset,
  DevicePreset,
  ExportFormat,
  ExportScale,
  FrameFamily,
  FrameOrientation,
  FrameState,
  ResolvedSource,
  SourceMode,
  SourceState,
  ThemePreference,
  ViewportPreset,
} from '@/types/app';

export type {
  BackgroundType,
  DesktopChromePreset,
  DevicePreset,
  ExportFormat,
  ExportScale,
  FitMode,
  FrameFamily,
  FrameOrientation,
  ResolvedSource,
  ShadowSize,
  SourceMode,
  SourceStatus,
  SourceStrategy,
  ViewportPreset,
} from '@/types/app';

interface AppState {
  source: SourceState;
  frame: FrameState;
  background: BackgroundState;
  export: {
    format: ExportFormat;
    scale: ExportScale;
  };
  appShell: AppShellState;
  setDraftUrl: (value: string) => void;
  setCaptureDelay: (value: CaptureDelay) => void;
  setCaptureSelector: (value: string) => void;
  startSourceLoading: (mode: SourceMode, pendingUrl?: string | null) => void;
  commitResolvedSource: (resolved: ResolvedSource) => void;
  failSourceLoading: (code: string, message: string) => void;
  clearSourceError: () => void;
  setFrameFamily: (family: FrameFamily) => void;
  setDesktopChromePreset: (preset: DesktopChromePreset) => void;
  setDevicePreset: (preset: DevicePreset) => void;
  setOrientation: (orientation: FrameOrientation) => void;
  setViewportPreset: (preset: ViewportPreset) => void;
  setCustomViewport: (dimension: 'width' | 'height', value: number) => void;
  updateFrame: (config: Partial<FrameState>) => void;
  updateBackground: (config: Partial<BackgroundState>) => void;
  updateExport: (config: Partial<{ format: ExportFormat; scale: ExportScale }>) => void;
  setThemePreference: (theme: ThemePreference) => void;
}

const themeStorageKey = 'fremit.theme';

function getSystemTheme(): ThemePreference {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(themeStorageKey);
  return stored === 'dark' || stored === 'light' ? stored : getSystemTheme();
}

const defaultFrame: FrameState = {
  family: 'desktop-browser',
  desktopChromePreset: 'mac',
  devicePreset: 'phone',
  orientation: 'portrait',
  viewportPreset: 'desktop',
  windowShadow: 'lg',
  windowRadius: 26,
  darkMode: true,
  showTitle: true,
  windowTitle: 'Fremit preview',
  windowWidth: 1440,
  windowHeight: 900,
  fitMode: 'contain',
  imageZoom: 100,
  imagePositionX: 50,
  imagePositionY: 50,
  showDeviceCamera: false,
};

const defaultBackground: BackgroundState = {
  bgType: 'gradient',
  bgColor: '#faf4ea',
  bgGradient: 'linear-gradient(135deg, #f7f0e7 0%, #cfe2df 52%, #f2d3b1 100%)',
  bgGradientType: 'linear',
  bgGradientDirection: 135,
  bgImage: null,
  padding: 56,
};

function withViewport(frame: FrameState, next: Partial<FrameState>) {
  const merged = { ...frame, ...next };
  const { width, height } = getViewportSize(
    merged.family,
    merged.viewportPreset,
    merged.devicePreset,
    merged.orientation,
    { width: merged.windowWidth, height: merged.windowHeight },
  );

  return {
    ...merged,
    windowWidth: width,
    windowHeight: height,
  };
}

export const useStore = create<AppState>((set) => ({
  source: {
    draftUrl: '',
    status: 'idle',
    active: null,
    pendingMode: null,
    pendingUrl: null,
    captureDelayMs: 3000,
    captureSelector: '',
    errorCode: null,
    errorMessage: null,
  },
  frame: defaultFrame,
  background: defaultBackground,
  export: {
    format: 'png',
    scale: 2,
  },
  appShell: (() => {
    const themePreference = getInitialThemePreference();
    return {
      themePreference,
    };
  })(),
  setDraftUrl: (value) =>
    set((state) => ({
      source: {
        ...state.source,
        draftUrl: value,
      },
    })),
  setCaptureDelay: (captureDelayMs) =>
    set((state) => ({
      source: {
        ...state.source,
        captureDelayMs,
      },
    })),
  setCaptureSelector: (captureSelector) =>
    set((state) => ({
      source: {
        ...state.source,
        captureSelector,
      },
    })),
  startSourceLoading: (mode, pendingUrl = null) =>
    set((state) => ({
      source: {
        ...state.source,
        status: 'loading',
        pendingMode: mode,
        pendingUrl,
        errorCode: null,
        errorMessage: null,
      },
    })),
  commitResolvedSource: (resolved) =>
    set((state) => {
      const isNewSource =
        state.source.active?.mode !== resolved.mode ||
        state.source.active?.sourceUrl !== resolved.sourceUrl;

      return {
        source: {
          ...state.source,
          status: 'ready',
          active: resolved,
          pendingMode: null,
          pendingUrl: null,
          draftUrl: resolved.sourceUrl ?? '',
          errorCode: null,
          errorMessage: null,
        },
        frame: {
          ...state.frame,
          windowTitle: resolved.title,
          fitMode: isNewSource && resolved.mode === 'website-url' ? 'cover' : state.frame.fitMode,
          imageZoom: isNewSource ? 100 : state.frame.imageZoom,
          imagePositionX: isNewSource ? 50 : state.frame.imagePositionX,
          imagePositionY: isNewSource ? 50 : state.frame.imagePositionY,
        },
      };
    }),
  failSourceLoading: (code, message) =>
    set((state) => ({
      source: {
        ...state.source,
        status: 'error',
        pendingMode: null,
        pendingUrl: null,
        errorCode: code,
        errorMessage: message,
      },
    })),
  clearSourceError: () =>
    set((state) => ({
      source: {
        ...state.source,
        status: state.source.active ? 'ready' : 'idle',
        errorCode: null,
        errorMessage: null,
      },
    })),
  setFrameFamily: (family) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        family,
        viewportPreset: family === 'device-frame' ? 'mobile' : state.frame.viewportPreset,
        desktopChromePreset: family === 'desktop-browser' ? state.frame.desktopChromePreset : 'minimal',
      }),
    })),
  setDesktopChromePreset: (preset) =>
    set((state) => ({
      frame: {
        ...state.frame,
        desktopChromePreset: preset,
      },
    })),
  setDevicePreset: (preset) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        devicePreset: preset,
        viewportPreset: preset === 'phone' ? 'mobile' : 'tablet',
      }),
    })),
  setOrientation: (orientation) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        orientation,
      }),
    })),
  setViewportPreset: (preset) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        viewportPreset: preset,
      }),
    })),
  setCustomViewport: (dimension, value) =>
    set((state) => ({
      frame: {
        ...state.frame,
        viewportPreset: 'custom',
        [dimension === 'width' ? 'windowWidth' : 'windowHeight']: Math.max(200, Math.round(value || 0)),
      },
    })),
  updateFrame: (config) =>
    set((state) => ({
      frame: {
        ...state.frame,
        ...config,
      },
    })),
  updateBackground: (config) =>
    set((state) => ({
      background: {
        ...state.background,
        ...config,
      },
    })),
  updateExport: (config) =>
    set((state) => ({
      export: {
        ...state.export,
        ...config,
      },
    })),
  setThemePreference: (themePreference) =>
    set((state) => ({
      appShell: {
        ...state.appShell,
        themePreference,
      },
    })),
}));
