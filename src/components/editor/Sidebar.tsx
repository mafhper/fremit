import type { ReactNode } from 'react';
import { DevicePanelIcon, ExportPanelIcon, LinkPanelIcon } from '@/components/icons/AppIcons';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';
import type { ResolvedSource } from '@/types/app';
import { SourceControls } from './ImageUpload';
import { FrameControls } from './WindowControls';
import { BackgroundControls } from './BackgroundControls';
import { DownloadButton } from './DownloadButton';

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-card rounded-[1.5rem] border p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--surface-muted))] text-foreground">
          {icon}
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function getSourceKindLabel(copy: ReturnType<typeof useI18n>['copy'], source: ResolvedSource | null) {
  if (!source) return null;

  const labels = copy.editor.sourceKinds;

  if (source.mode === 'website-url') return labels.websiteUrl;
  if (source.mode === 'image-url') return labels.imageUrl;
  if (source.mode === 'upload') return labels.upload;
  return labels.clipboardImage;
}

export function Sidebar() {
  const { copy } = useI18n();
  const source = useStore((state) => state.source);
  const sourceKind = getSourceKindLabel(copy, source.active);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[hsl(var(--surface))/0.94]" data-testid="editor-panel">
      <div className="border-b border-border/80 px-4 py-4">
        <div className="rounded-[1.25rem] border border-border/80 bg-[hsl(var(--surface-muted))/0.7] px-4 py-3 text-sm">
          {source.active ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
                {copy.editor.currentSource}
              </p>
              <p className="mt-2 font-semibold text-foreground">{source.active.title}</p>
              {sourceKind && <p className="mt-1 text-[hsl(var(--text-muted))]">{sourceKind}</p>}
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
                {copy.editor.currentSource}
              </p>
              <p className="mt-2 font-semibold text-foreground">{copy.editor.noSource}</p>
              <p className="mt-1 text-[hsl(var(--text-muted))]">{copy.editor.noSourceHint}</p>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <Section title={copy.editor.sections.source} icon={<LinkPanelIcon className="h-5 w-5" />}>
            <SourceControls variant="editor" />
          </Section>

          <Section title={copy.editor.sections.frame} icon={<DevicePanelIcon className="h-5 w-5" />}>
            <FrameControls />
          </Section>

          <Section title={copy.editor.sections.background} icon={<span className="h-3 w-3 rounded-full bg-accent" />}>
            <BackgroundControls />
          </Section>

          <Section title={copy.editor.sections.export} icon={<ExportPanelIcon className="h-5 w-5" />}>
            <DownloadButton />
          </Section>
        </div>
      </div>
    </aside>
  );
}
