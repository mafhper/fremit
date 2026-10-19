/**
 * Brand sidebar (block E of the sidebar plan): a local-first brand kit — a
 * palette, a heading font, a body font and a logo — kept in localStorage with
 * no backend and no account. Applying goes through the store like any other
 * edit: a color fills the selected text/shape (or the page when nothing is
 * selected), a font applies to the selected text, and the logo inserts as a
 * normal image object. The kit never becomes a second source of truth.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { RuneCloudUploadIcon } from '@/components/icons/rune/CloudUpload';
import { RuneImageIcon } from '@/components/icons/rune/Image';
import { RunePlusIcon } from '@/components/icons/rune/Plus';
import { RuneXIcon } from '@/components/icons/rune/X';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import {
  addBrandColor,
  isValidBrandLogo,
  loadBrandKit,
  removeBrandColor,
  saveBrandKit,
  setBrandFont,
  setBrandLogo,
  BRAND_COLOR_LIMIT,
  type BrandKit,
} from '@/lib/brandKit';
import { createImageObject } from '@/lib/document';
import { fileToDataUrl } from '@/lib/sourceResolver';
import { FONT_OPTIONS } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
      {children}
    </h3>
  );
}

export function BrandPanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const updateObject = useStore((state) => state.updateObject);
  const addObject = useStore((state) => state.addObject);
  const setPageBackground = useStore((state) => state.setPageBackground);
  const [kit, setKit] = useState<BrandKit>(() => loadBrandKit());
  const [draftColor, setDraftColor] = useState('#1f6feb');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  const selected = page?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedText = selected?.type === 'text' ? selected : null;
  const fillTarget = selected && (selected.type === 'text' || selected.type === 'shape') ? selected : null;

  if (!page) return null;

  const update = (next: BrandKit) => {
    if (next === kit) return;

    setKit(next);
    saveBrandKit(next);
  };

  /** A color fills the selection; with nothing selected it fills the page. */
  const applyColor = (color: string) => {
    if (fillTarget) {
      updateObject(fillTarget.id, { type: fillTarget.type, fill: color });
      return;
    }

    setPageBackground(page.id, { kind: 'solid', color });
  };

  const applyFont = (stack: string) => {
    if (!selectedText) return;

    updateObject(selectedText.id, { type: 'text', fontFamily: stack });
  };

  const handleLogoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setError(null);
      const dataUrl = await fileToDataUrl(file);

      // The kit refuses a value it cannot store (wrong type, over the cap);
      // the panel says so instead of saving nothing silently.
      if (!isValidBrandLogo(dataUrl)) {
        setError(copy.brand.error);
        return;
      }

      update(setBrandLogo(kit, dataUrl));
    } catch {
      setError(copy.brand.error);
    }
  };

  const insertLogo = () => {
    if (!kit.logo) return;

    addObject(
      createImageObject(kit.logo, {
        name: 'Logo',
        x: Math.round(page.width * 0.35),
        y: Math.round(page.height * 0.35),
        width: Math.round(page.width * 0.3),
        height: Math.round(page.height * 0.3),
      }),
    );
  };

  const fontOptions = FONT_OPTIONS;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SectionTitle>{copy.brand.palette}</SectionTitle>
        <p className="text-[11px] leading-4 text-[hsl(var(--text-muted))]">{copy.brand.paletteHint}</p>

        <div className="grid grid-cols-4 gap-1.5" data-testid="brand-palette">
          {kit.colors.map((color, index) => (
            <div key={color} className="relative">
              <button
                type="button"
                data-testid="brand-swatch"
                data-color={color}
                aria-label={color}
                onClick={() => applyColor(color)}
                className={cn(
                  'h-9 w-full rounded-[0.7rem] border border-border/70 transition',
                  'hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                style={{ backgroundColor: color }}
              />
              <button
                type="button"
                data-testid="brand-remove-color"
                data-color={color}
                aria-label={`${copy.brand.removeColor} ${index + 1}`}
                onClick={() => update(removeBrandColor(kit, color))}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-border/70 bg-background text-[hsl(var(--text-muted))] transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RuneXIcon className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={copy.brand.addColor}
            data-testid="brand-color-input"
            value={draftColor}
            onChange={(event) => setDraftColor(event.target.value)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-border/70 bg-background p-0.5"
          />
          <Button
            type="button"
            variant="outline"
            data-testid="brand-color-add"
            disabled={kit.colors.length >= BRAND_COLOR_LIMIT}
            onClick={() => update(addBrandColor(kit, draftColor))}
            className="h-8 flex-1 justify-start gap-1.5 rounded-[0.8rem] px-2 text-xs"
          >
            <RunePlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.brand.addColor}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>{copy.brand.fonts}</SectionTitle>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
            {copy.brand.headingFont}
          </span>
          <Select
            value={kit.headingFont}
            onValueChange={(value) => update(setBrandFont(kit, 'heading', value))}
          >
            <SelectTrigger
              aria-label={copy.brand.headingFont}
              data-testid="brand-font-heading"
              className="h-8 min-w-0 flex-1 rounded-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((option) => (
                <SelectItem key={option.stack} value={option.stack}>
                  <span style={{ fontFamily: option.stack }}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            aria-label={`${copy.brand.applyFont} · ${copy.brand.headingFont}`}
            data-testid="brand-apply-heading"
            disabled={!selectedText}
            onClick={() => applyFont(kit.headingFont)}
            className="h-8 shrink-0 rounded-lg px-2 text-[11px]"
          >
            {copy.brand.applyFont}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
            {copy.brand.bodyFont}
          </span>
          <Select
            value={kit.bodyFont}
            onValueChange={(value) => update(setBrandFont(kit, 'body', value))}
          >
            <SelectTrigger
              aria-label={copy.brand.bodyFont}
              data-testid="brand-font-body"
              className="h-8 min-w-0 flex-1 rounded-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((option) => (
                <SelectItem key={option.stack} value={option.stack}>
                  <span style={{ fontFamily: option.stack }}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            aria-label={`${copy.brand.applyFont} · ${copy.brand.bodyFont}`}
            data-testid="brand-apply-body"
            disabled={!selectedText}
            onClick={() => applyFont(kit.bodyFont)}
            className="h-8 shrink-0 rounded-lg px-2 text-[11px]"
          >
            {copy.brand.applyFont}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>{copy.brand.logo}</SectionTitle>

        <div className="flex items-center gap-2">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.5]">
            {kit.logo ? (
              <img
                src={kit.logo}
                alt={copy.brand.logo}
                data-testid="brand-logo-preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <RuneImageIcon className="h-4 w-4 text-[hsl(var(--text-muted))]" aria-hidden="true" />
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              data-testid="brand-logo-upload"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 justify-start gap-1.5 rounded-[0.8rem] px-2 text-xs"
            >
              <RuneCloudUploadIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.brand.uploadLogo}
            </Button>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                data-testid="brand-logo-insert"
                disabled={!kit.logo}
                onClick={insertLogo}
                className="h-8 flex-1 rounded-[0.8rem] px-2 text-xs"
              >
                {copy.brand.insertLogo}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="brand-logo-remove"
                disabled={!kit.logo}
                onClick={() => update(setBrandLogo(kit, null))}
                className="h-8 rounded-[0.8rem] px-2 text-xs"
              >
                {copy.brand.removeLogo}
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label={copy.brand.uploadLogo}
          data-testid="brand-logo-file"
          className="hidden"
          onChange={handleLogoFile}
        />

        {error && (
          <p role="alert" data-testid="brand-error" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
