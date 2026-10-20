/**
 * InstallButton.tsx
 * Botão "Instalar" do promo-site: detecta o sistema, aponta para o instalador da última release
 * e abre um menu com as outras plataformas. Sem release ou sem asset compatível, leva à página
 * de releases.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui';
import { useLatestRelease } from '@/hooks/useLatestRelease';
import { useI18n } from '@/i18n/useI18n';
import { detectPlatform, pickAsset, type CpuArch, type DesktopOS } from '@/lib/platform';
import { cn } from '@/lib/utils';

const OS_NAMES: Record<DesktopOS, string> = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };

interface InstallButtonProps {
  /** Repositório no formato owner/name. */
  repo?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export function InstallButton({ repo = 'mafhper/fremit', variant = 'default', className }: InstallButtonProps) {
  const { copy } = useI18n();
  const release = useLatestRelease(repo);
  const platform = useMemo(() => detectPlatform(), []);

  const releasesUrl = `https://github.com/${repo}/releases/latest`;
  const assets = release.status === 'ready' ? release.release.assets : [];
  const hrefFor = (os: DesktopOS, arch?: CpuArch) => pickAsset(assets, os, arch)?.browser_download_url ?? releasesUrl;

  const primaryLabel = platform.os ? `${copy.install.downloadFor} ${OS_NAMES[platform.os]}` : copy.install.cta;
  const primaryHref = platform.os ? hrefFor(platform.os) : releasesUrl;

  const others: Array<{ key: string; label: string; href: string }> = [
    { key: 'windows', label: OS_NAMES.windows, href: hrefFor('windows') },
    { key: 'macos-arm', label: `${OS_NAMES.macos} (Apple Silicon)`, href: hrefFor('macos', 'arm64') },
    { key: 'macos-x64', label: `${OS_NAMES.macos} · ${copy.install.macIntel}`, href: hrefFor('macos', 'x64') },
    { key: 'linux', label: OS_NAMES.linux, href: hrefFor('linux') },
  ];

  return (
    <div className={cn('relative items-center gap-1', className)} data-testid="install-button">
      <Button asChild variant={variant} className="rounded-full px-4 md:px-5">
        <a
          href={primaryHref}
          rel="noopener"
          title={platform.mobile ? copy.install.desktopOnly : undefined}
          data-testid="install-primary"
        >
          {primaryLabel}
        </a>
      </Button>

      <details className="group relative">
        <summary
          aria-label={copy.install.otherPlatforms}
          title={copy.install.otherPlatforms}
          className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-border/80 bg-[hsl(var(--surface-muted))] text-xs transition hover:bg-[hsl(var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        >
          <span aria-hidden="true" className="transition group-open:rotate-180">▾</span>
        </summary>
        <ul className="absolute right-0 top-full z-50 mt-2 w-60 space-y-1 rounded-2xl border border-border/80 bg-popover p-2 text-sm text-popover-foreground shadow-2xl">
          {others.map((item) => (
            <li key={item.key}>
              <a href={item.href} rel="noopener" className="block rounded-xl px-3 py-2 hover:bg-[hsl(var(--surface-muted))]">
                {item.label}
              </a>
            </li>
          ))}
          <li className="border-t border-border/60 pt-1">
            <a href={releasesUrl} rel="noopener" className="block rounded-xl px-3 py-2 hover:bg-[hsl(var(--surface-muted))]">
              {copy.install.allReleases}
            </a>
          </li>
        </ul>
      </details>
    </div>
  );
}
