import { create } from 'zustand';

export type WindowType = 'mac' | 'win' | 'none';
export type ShadowSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type BackgroundType = 'solid' | 'gradient' | 'image';

export interface AppState {
    // Image
    imageUrl: string | null;
    imageScale: number; // 0.5 to 1.5

    // Window
    windowType: WindowType;
    windowShadow: ShadowSize;
    windowRadius: number; // 0 to 24
    darkMode: boolean;
    showTitle: boolean;
    windowTitle: string;
    windowWidth: number;
    windowHeight: number;
    autoResize: boolean;

    // Background
    bgType: BackgroundType;
    bgColor: string;
    bgGradient: string;
    bgGradientType: 'linear' | 'radial';
    bgGradientDirection: number; // 0 to 360
    bgImage: string | null;
    padding: number; // 0 to 128

    // App Theme
    appTheme: 'light' | 'dark' | 'system';

    // Actions
    setImage: (url: string | null) => void;
    setConfig: (config: Partial<AppState>) => void;
}

export const useStore = create<AppState>((set) => ({
    imageUrl: null,
    imageScale: 1,

    windowType: 'mac',
    windowShadow: 'xl',
    windowRadius: 12,
    darkMode: true,
    showTitle: true,
    windowTitle: 'Fremit App',
    windowWidth: 800,
    windowHeight: 600,
    autoResize: true,

    bgType: 'gradient',
    bgColor: '#ffffff',
    bgGradient: 'linear-gradient(to right, #8e2de2, #4a00e0)',
    bgGradientType: 'linear',
    bgGradientDirection: 135,
    bgImage: null,
    padding: 64,

    appTheme: 'dark',

    setImage: (url) => set({ imageUrl: url }),
    setConfig: (config) => set((state) => ({ ...state, ...config })),
}));
