import { Button } from '@/components/ui';
import { ThemeDarkIcon, ThemeLightIcon } from '@/components/icons/AppIcons';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';

export function ThemeSelector() {
  const { copy } = useI18n();
  const themePreference = useStore((state) => state.appShell.themePreference);
  const setThemePreference = useStore((state) => state.setThemePreference);
  const isDark = themePreference === 'dark';
  const ActiveIcon = isDark ? ThemeDarkIcon : ThemeLightIcon;
  const nextTheme = isDark ? 'light' : 'dark';
  const currentLabel = isDark ? copy.theme.dark : copy.theme.light;
  const actionLabel = isDark ? copy.theme.toggleToLight : copy.theme.toggleToDark;
  const ariaLabel = `${copy.theme.colorSelector}. ${copy.theme.current}: ${currentLabel}. ${actionLabel}.`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-full border border-border/80 bg-[hsl(var(--surface-muted))] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface))] hover:text-foreground focus-visible:ring-offset-0"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => setThemePreference(nextTheme)}
    >
      <ActiveIcon className="h-4 w-4" />
    </Button>
  );
}
