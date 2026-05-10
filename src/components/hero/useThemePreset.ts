/**
 * useThemePreset.ts
 * Hook que devolve o preset WebGL correto para o tema atual e reage a:
 * - classe `dark` no <html>, usada por toggles manuais;
 * - preferência do sistema via prefers-color-scheme.
 *
 * Nota: o estado inicial já resolve o preset via useState lazy initializer.
 * O useEffect apenas observa mudanças futuras — sem setPreset adicional
 * que causaria re-render desnecessário na montagem.
 */

import { useEffect, useState } from 'react';
import { liquidPresets, type LiquidPreset } from './presets';

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function resolvePreset(): LiquidPreset {
  if (!canUseDom()) {
    return liquidPresets.light;
  }

  if (document.documentElement.classList.contains('dark')) {
    return liquidPresets.dark;
  }

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return liquidPresets.dark;
  }

  return liquidPresets.light;
}

export function useThemePreset(): LiquidPreset {
  const [preset, setPreset] = useState<LiquidPreset>(() => resolvePreset());

  useEffect(() => {
    if (!canUseDom()) return;

    const updatePreset = () => {
      setPreset(resolvePreset());
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
  }, []);

  return preset;
}
