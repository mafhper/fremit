import * as Popover from '@radix-ui/react-popover';
import { GlobePanelIcon } from '@/components/icons/AppIcons';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';

export function LocaleSelector() {
  const { copy, locale, localeOptions, setLocale } = useI18n();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full border border-border/80 bg-[hsl(var(--surface-muted))] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface))] hover:text-foreground focus-visible:ring-offset-0"
          aria-label={copy.footer.language}
          title={copy.footer.language}
        >
          <GlobePanelIcon className="h-4 w-4" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          align="end"
          className="z-50 w-36 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          <div className="space-y-1">
            {localeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLocale(option.value)}
                className={
                  locale === option.value
                    ? 'flex w-full items-center justify-between rounded-xl bg-[hsl(var(--surface-muted))] px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    : 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[hsl(var(--text-muted))] transition hover:bg-[hsl(var(--surface-muted))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                }
              >
                <span>{option.label}</span>
                {locale === option.value && <span className="text-xs text-[hsl(var(--text-soft))]">•</span>}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
