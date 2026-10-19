/**
 * Page fill editor (schema v2): one solid color, one linear gradient or one
 * image per page. The document is the source of truth for the active kind; the
 * tab follows it, and the local state only covers what the document cannot
 * hold: the draft of a kind that has not written yet (image, which waits for a
 * real source), scoped to the page it was clicked on — so switching pages
 * never leaves the editor claiming a fill the page does not have — and the
 * last solid/gradient the page showed, so switching to the image kind and
 * back restores the previous fill instead of the default white. Switching to
 * solid or gradient writes the new fill immediately; an empty image
 * background is never written.
 *
 * Used by the inspector (page state) and by the Background panel, both writing
 * through the same store action.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { PaintBucket } from 'lucide-react';
import { RuneCloudUploadIcon } from '@/components/icons/rune/CloudUpload';
import { RuneImageIcon } from '@/components/icons/rune/Image';
import { RuneLink2Icon } from '@/components/icons/rune/Link2';
import { RuneSparklesIcon } from '@/components/icons/rune/Sparkles';
import { RuneTrash2Icon } from '@/components/icons/rune/Trash2';
import type { IconComponent } from '@/components/icons/RuneIcon';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import {
  IMAGE_SOURCE_ACCEPT,
  ImageSourceError,
  imageSourceErrorMessage,
  resolveImageSourceFile,
  resolveImageSourceUrl,
} from '@/lib/imageSource';
import type { GradientPageBackground, PageBackground } from '@/lib/document';
import { backgroundPreviewAspect, pageBackgroundsEqual } from '@/lib/pageBackground';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';

type BackgroundKind = PageBackground['kind'];
type NonImageBackground = Exclude<PageBackground, { kind: 'image' }>;

const DEFAULT_GRADIENT: GradientPageBackground = {
  kind: 'gradient',
  from: '#f5f0e8',
  to: '#1f6feb',
  angle: 135,
};

const DEFAULT_SOLID = '#ffffff';

/**
 * Last solid and gradient a page showed while the panel was open. The document
 * stores one fill per page, so switching to the image kind would otherwise
 * lose the color: this is the memory that restores it when the user switches
 * back.
 */
interface RememberedFill {
  pageId: string;
  solid: string;
  gradient: GradientPageBackground;
}

export function PageBackgroundField() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const setPageBackground = useStore((state) => state.setPageBackground);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // The stored kind is the truth; the draft only covers the tab that has not
  // written yet (image, which waits for a source), and it is scoped to the
  // page it was clicked on so switching pages never shows a stale tab.
  const [draftKind, setDraftKind] = useState<{ pageId: string; kind: BackgroundKind } | null>(
    null,
  );
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFill, setLastFill] = useState<RememberedFill | null>(null);
  // The exact fill an image replaced, scoped to its page. Removing the image
  // restores this value — not a default — and only a new image entry (from a
  // non-image fill) can set it, so swapping the source twice keeps the original.
  const [returnFill, setReturnFill] = useState<{
    pageId: string;
    fill: NonImageBackground;
  } | null>(null);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  const background = page?.background ?? null;

  if (!page || !background) return null;

  const activeKind: BackgroundKind =
    draftKind && draftKind.pageId === page.id ? draftKind.kind : background.kind;

  const kindLabels: Record<BackgroundKind, string> = {
    solid: copy.background.solid,
    gradient: copy.background.gradient,
    image: copy.background.image,
  };
  const kindIcons: Record<BackgroundKind, IconComponent> = {
    solid: PaintBucket,
    gradient: RuneSparklesIcon,
    image: RuneImageIcon,
  };

  const rememberedFill = lastFill && lastFill.pageId === page.id ? lastFill : null;
  const solidColor =
    background.kind === 'solid'
      ? background.color
      : background.kind === 'gradient'
        ? background.from
        : rememberedFill?.solid ?? DEFAULT_SOLID;
  const gradient: GradientPageBackground =
    background.kind === 'gradient'
      ? background
      : rememberedFill?.gradient ??
        {
          ...DEFAULT_GRADIENT,
          from: background.kind === 'solid' ? background.color : DEFAULT_GRADIENT.from,
        };

  /** Remembers a solid/gradient fill for this page; an image is not a fill. */
  const rememberFill = (fill: PageBackground) => {
    if (fill.kind === 'image') return;

    setLastFill((previous) => {
      const samePage = previous?.pageId === page.id;
      const next: RememberedFill = {
        pageId: page.id,
        solid: fill.kind === 'solid' ? fill.color : samePage ? previous.solid : DEFAULT_SOLID,
        gradient: fill.kind === 'gradient' ? fill : samePage ? previous.gradient : DEFAULT_GRADIENT,
      };
      const unchanged =
        previous !== null &&
        previous.pageId === next.pageId &&
        previous.solid === next.solid &&
        pageBackgroundsEqual(previous.gradient, next.gradient);

      return unchanged ? previous : next;
    });
  };

  /** Writes a fill through the store and keeps it as the page's last one. */
  const writeBackground = (fill: PageBackground) => {
    setPageBackground(page.id, fill);
    rememberFill(fill);
  };

  const switchKind = (kind: BackgroundKind) => {
    setDraftKind({ pageId: page.id, kind });

    if (kind === background.kind) return;

    // Leaving the image tab is a removal too: the remembered return belongs to
    // the image entry that just ended.
    if (kind !== 'image') setReturnFill(null);

    // The fill being left behind is remembered even when it never went through
    // this panel (a loaded document), so switching back restores it.
    rememberFill(background);

    // A new kind starts from what the page already shows; the image kind has
    // no source to start from, so it waits for the URL/upload controls.
    if (kind === 'solid') {
      writeBackground({ kind: 'solid', color: solidColor });
    } else if (kind === 'gradient') {
      writeBackground(gradient);
    }
  };

  const setGradient = (patch: Partial<GradientPageBackground>) => {
    writeBackground({ ...gradient, ...patch, kind: 'gradient' });
  };

  const applyImage = (src: string) => {
    setError(null);
    // The fill the page is leaving survives the image fill, and it is the exact
    // value the remove action puts back. A source swap keeps the first one.
    if (background.kind !== 'image') {
      rememberFill(background);
      setReturnFill({ pageId: page.id, fill: background });
    }
    setPageBackground(page.id, { kind: 'image', src });
  };

  const removeImage = () => {
    setError(null);
    const remembered = returnFill && returnFill.pageId === page.id ? returnFill.fill : null;
    const restored: NonImageBackground =
      remembered ?? { kind: 'solid', color: rememberedFill?.solid ?? DEFAULT_SOLID };

    writeBackground(restored);
    setReturnFill(null);
    setDraftKind({ pageId: page.id, kind: restored.kind });
  };

  /** Localized message of a refused source; the code is the contract. */
  const errorMessage = (failure: unknown) =>
    failure instanceof ImageSourceError
      ? imageSourceErrorMessage(failure.code, copy.background)
      : copy.background.error;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      applyImage(await resolveImageSourceFile(file));
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const handleUrl = async () => {
    const trimmed = imageUrl.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      const src = await resolveImageSourceUrl(trimmed);

      applyImage(src);
      setImageUrl('');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="page-background">
      <div role="tablist" aria-label={copy.background.kind} className="grid grid-cols-3 gap-1">
        {(Object.keys(kindLabels) as BackgroundKind[]).map((kind) => {
          const Icon = kindIcons[kind];

          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={activeKind === kind}
              data-testid={`background-kind-${kind}`}
              onClick={() => switchKind(kind)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-[0.7rem] border px-2 py-1.5 text-xs font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeKind === kind
                  ? 'border-accent/60 bg-[hsl(var(--surface-muted))/0.8] text-foreground'
                  : 'border-border/70 bg-background text-[hsl(var(--text-muted))] hover:border-accent/50',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {kindLabels[kind]}
            </button>
          );
        })}
      </div>

      {activeKind === 'solid' && (
        <div data-testid="background-color">
          <ColorField
            label={copy.background.color}
            value={solidColor}
            onChange={(color) => writeBackground({ kind: 'solid', color })}
          />
        </div>
      )}

      {activeKind === 'gradient' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div data-testid="background-from">
              <ColorField
                label={copy.background.from}
                value={gradient.from}
                onChange={(color) => setGradient({ from: color })}
              />
            </div>
            <div data-testid="background-to">
              <ColorField
                label={copy.background.to}
                value={gradient.to}
                onChange={(color) => setGradient({ to: color })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
              {copy.background.angle}
            </span>
            <NumberField
              label={copy.background.angle}
              value={gradient.angle}
              min={0}
              max={360}
              testId="background-angle"
              onCommit={(value) => setGradient({ angle: value })}
            />
          </div>
        </div>
      )}

      {activeKind === 'image' && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            data-testid="background-image-upload"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-full justify-start gap-2 rounded-[0.9rem]"
          >
            <RuneCloudUploadIcon className="h-4 w-4" aria-hidden="true" />
            {copy.background.uploadImage}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_SOURCE_ACCEPT}
            aria-label={copy.background.uploadImage}
            data-testid="background-image-file"
            className="hidden"
            onChange={handleFile}
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder={copy.background.imagePlaceholder}
              aria-label={copy.background.imageUrl}
              data-testid="background-image-url"
              spellCheck={false}
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-[0.9rem] border border-border/70 bg-background px-2 text-xs text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
            />
            <Button
              type="button"
              data-testid="background-image-add-url"
              onClick={handleUrl}
              disabled={busy || imageUrl.trim() === ''}
              className="h-9 shrink-0 gap-1.5 rounded-[0.9rem] px-3"
            >
              <RuneLink2Icon className="h-4 w-4" aria-hidden="true" />
              {copy.background.addImage}
            </Button>
          </div>

          {background.kind === 'image' && (
            <div className="space-y-2">
              {/* The preview is a frame around the stored source, at the page
                  format the document is in — the same source the canvas,
                  thumbnail and export paint. Changing the format only changes
                  this frame's ratio; the background is not recreated. */}
              <div
                role="img"
                aria-label={copy.background.preview}
                data-testid="background-image-preview"
                style={{ aspectRatio: backgroundPreviewAspect(page) }}
                className="w-full overflow-hidden rounded-[0.7rem] border border-border/70 bg-[hsl(var(--surface-muted))]"
              >
                <img
                  src={background.src}
                  alt=""
                  draggable={false}
                  data-testid="background-image-preview-img"
                  className="h-full w-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                data-testid="background-image-remove"
                onClick={removeImage}
                className="h-9 w-full justify-start gap-2 rounded-[0.9rem]"
              >
                <RuneTrash2Icon className="h-4 w-4" aria-hidden="true" />
                {copy.background.removeImage}
              </Button>
              <p className="truncate text-[11px] text-[hsl(var(--text-muted))]">
                {copy.background.imageActive}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" data-testid="background-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
