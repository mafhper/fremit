import * as Popover from '@radix-ui/react-popover';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GitHubPanelIcon, MenuPanelIcon } from '@/components/icons/AppIcons';
import iconUrl from '/icon.svg?url';
import { LocaleSelector } from '@/components/layout/LocaleSelector';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { Button } from '@/components/ui';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useI18n } from '@/i18n/useI18n';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', key: 'home' as const },
  { to: '/about', key: 'about' as const },
];

export function ProductLayout() {
  useApplyTheme();
  const { copy } = useI18n();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [scrollActive, setScrollActive] = useState(false);

  useEffect(() => {
    if (!isHome) {
      return;
    }
    
    const onScroll = () => setScrollActive(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const scrolled = !isHome || scrollActive;

  const commitLabel = __APP_LAST_COMMIT__.subject || __APP_LAST_COMMIT__.hash;
  const commitPreview = commitLabel.length > 44 ? `${commitLabel.slice(0, 44).trimEnd()}...` : commitLabel;
  const commitTitle = [__APP_LAST_COMMIT__.subject, __APP_LAST_COMMIT__.hash, __APP_LAST_COMMIT__.date]
    .filter(Boolean)
    .join(' · ');
  const commitUrl = `${__APP_REPOSITORY__.url}/commit/${__APP_LAST_COMMIT__.hash}`;

  const headerClass = scrolled
    ? 'border-b border-border/80 bg-background/80 backdrop-blur'
    : 'border-b border-transparent bg-transparent';

  const brandClass = scrolled ? 'text-foreground' : 'text-foreground/90';

  return (
    <div className={cn("flex flex-col text-foreground", isHome ? "h-svh overflow-hidden" : "min-h-svh")}>
      <header className={cn("fixed top-0 right-0 left-0 z-50 transition-all duration-500", headerClass)}>
        <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-6">
          <Link to="/" className={cn("flex items-center gap-3 justify-self-start transition-colors", brandClass)}>
            <img src={iconUrl} alt={copy.brandName} className="h-9 w-9" />
            <span className="text-base font-semibold tracking-tight">{copy.brandName}</span>
          </Link>

          <nav className="hidden items-center justify-center gap-1 text-sm font-medium text-[hsl(var(--text-muted))] md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-full bg-[hsl(var(--surface)/0.9)] px-4 py-2 text-foreground shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    : 'rounded-full px-4 py-2 transition hover:bg-[hsl(var(--surface)/0.7)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                }
              >
                {copy.nav[item.key]}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-2 md:gap-3">
            <Button asChild className="hidden rounded-full px-4 md:inline-flex md:px-5">
              <Link to="/editor">{copy.nav.openApp}</Link>
            </Button>
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border/80 bg-[hsl(var(--surface-muted))] md:hidden"
                  aria-label={copy.nav.menu}
                  title={copy.nav.menu}
                >
                  <MenuPanelIcon className="h-4 w-4" />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  sideOffset={10}
                  align="end"
                  className="z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-border/80 bg-popover p-3 text-popover-foreground shadow-2xl md:hidden"
                >
                  <div className="space-y-3">
                    <nav className="space-y-1">
                      {navItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          className={({ isActive }) =>
                            isActive
                              ? 'flex rounded-[1rem] bg-[hsl(var(--surface-muted))] px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                              : 'flex rounded-[1rem] px-4 py-3 text-sm text-[hsl(var(--text-muted))] transition hover:bg-[hsl(var(--surface-muted))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          }
                        >
                          {copy.nav[item.key]}
                        </NavLink>
                      ))}
                    </nav>

                    <Button asChild className="h-11 w-full rounded-[1rem]">
                      <Link to="/editor">{copy.nav.openApp}</Link>
                    </Button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </header>

      <div className="pt-16 flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>

      <footer className="relative z-10 border-t border-border/5 bg-transparent shrink-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 text-xs text-[hsl(var(--text-soft))] md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span>{copy.footer.lastCommit}</span>
            <a
              href={commitUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/80 px-3 py-1 text-[hsl(var(--text-muted))] transition hover:border-border hover:bg-[hsl(var(--surface-muted))] hover:text-foreground"
              title={commitTitle}
            >
              <GitHubPanelIcon className="h-4 w-4 shrink-0" />
              <span className="max-w-[17rem] truncate sm:max-w-[22rem] md:max-w-[26rem]">{commitPreview}</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeSelector />
            <LocaleSelector />
          </div>
        </div>
      </footer>
    </div>
  );
}
