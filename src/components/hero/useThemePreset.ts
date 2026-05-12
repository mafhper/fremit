/**
 * useThemePreset.ts
 * Hook que devolve o preset WebGL correto para o tema atual e a página.
 */

import { useEffect, useState } from 'react';
import { liquidPresets, type LiquidPreset } from './presets';

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export type LiquidVariant = 'home' | 'about';

function resolvePreset(variant: LiquidVariant): LiquidPreset {
  if (!canUseDom()) {
    return liquidPresets[variant].light;
  }

  const root = document.documentElement;
  const isDark = root.classList.contains('dark') ||
    (!root.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return isDark ? liquidPresets[variant].dark : liquidPresets[variant].light;
}

export function useThemePreset(variant: LiquidVariant = 'home'): LiquidPreset {
  const [preset, setPreset] = useState<LiquidPreset>(() => resolvePreset(variant));

  useEffect(() => {
    if (!canUseDom()) return;

    const updatePreset = () => {
      setPreset(resolvePreset(variant));
    };

    const mutationObserver = new MutationObserver(updatePreset);
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updatePreset);

    return () => {
      mutationObserver.disconnect();
      mediaQuery.removeEventListener('change', updatePreset);
    };
  }, [variant]);

  return preset;
}
