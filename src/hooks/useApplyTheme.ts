import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

const storageKey = 'fremit.theme';

export function useApplyTheme() {
  const themePreference = useStore((state) => state.appShell.themePreference);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(storageKey, themePreference);
  }, [themePreference]);
}
