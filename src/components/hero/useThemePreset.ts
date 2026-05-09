/**
 * useThemePreset.ts
 * Hook que devolve o preset WebGL correto para o tema atual e reage
 * automaticamente a qualquer mudança — seja pelo toggle manual da UI
 * (que adiciona/remove a classe `dark` no <html>) ou pela preferência
 * do sistema (prefers-color-scheme).
 *
 * Substitui a função isDarkTheme() do webgl.ts, que era uma leitura
 * única sem capacidade de observar mudanças posteriores.
 */

import { useEffect, useState } from 'react';
import { liquidPresets, type LiquidPreset } from './presets';

function resolvePreset(): LiquidPreset {
  // Tailwind darkMode: 'class' → verifica classe no <html>
  if (document.documentElement.classList.contains('dark')) {
    return liquidPresets.dark;
  }
  // Tailwind darkMode: 'media' → verifica prefers-color-scheme diretamente
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return liquidPresets.dark;
  }
  return liquidPresets.light;
}

export function useThemePreset(): LiquidPreset {
  const [preset, setPreset] = useState<LiquidPreset>(() => {
    // SSR guard — em ambientes sem DOM retorna o preset claro
    if (typeof document === 'undefined') return liquidPresets.light;
    return resolvePreset();
  });

  useEffect(() => {
    // Observa mudança da classe `dark` no <html> (toggle manual pelo usuário)
    const mo = new MutationObserver(() => {
      setPreset(resolvePreset());
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Observa mudança de preferência do sistema operacional
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => setPreset(resolvePreset());
    mq.addEventListener('change', onMqChange);

    // Leitura inicial após mount para garantir sincronismo
    setPreset(resolvePreset());

    return () => {
      mo.disconnect();
      mq.removeEventListener('change', onMqChange);
    };
  }, []);

  return preset;
}
