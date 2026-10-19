/**
 * Export panel of the dedicated canvas: exports the active page of the
 * Documento JSON through the client-side exporter (WebP by default; PNG, JPG
 * and SVG as options). The mockup composer keeps its own DOM-based export
 * until the document export replaces it.
 */

import { useState } from 'react';
import { ExportPanelIcon } from '@/components/icons/AppIcons';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import { downloadArtifact } from '@/lib/export/download';
import { exportPage } from '@/lib/export/exporter';
import {
  DEFAULT_EXPORT_FORMAT_ID,
  EXPORT_FORMATS,
  requireExportFormat,
  type ExportFormatId,
} from '@/lib/export/formats';
import { WEBP_QUALITY } from '@/lib/export/renderPage';
import { useStore } from '@/store/useStore';

const EXPORT_SCALES = [1, 2, 3] as const;
type ExportScaleOption = (typeof EXPORT_SCALES)[number];

/** The renderer's lossy default, as the slider's percent (single source: WEBP_QUALITY). */
const DEFAULT_QUALITY_PERCENT = Math.round(WEBP_QUALITY * 100);

/** Select values arrive as strings; anything outside the catalog falls back to 1x. */
function toExportScale(value: string): ExportScaleOption {
  const candidate = Number(value);
  return EXPORT_SCALES.find((option) => option === candidate) ?? 1;
}

export function ExportPanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const [format, setFormat] = useState<ExportFormatId>(DEFAULT_EXPORT_FORMAT_ID);
  const [scale, setScale] = useState<ExportScaleOption>(1);
  const [quality, setQuality] = useState(DEFAULT_QUALITY_PERCENT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The catalog is the single source of truth for the format capabilities:
  // the select only offers catalog ids, and an id outside it is a bug that
  // fails loudly (same policy as the exporter) instead of being coerced.
  const definition = requireExportFormat(format);

  // PNG is lossless and SVG is not raster: the quality slider only drives the
  // lossy raster formats (WebP, JPG), as declared in the catalog.
  const qualityApplies = definition.lossy;

  const handleExport = async () => {
    if (busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const artifact = await exportPage(document, activePageId, format, {
        scale,
        quality: qualityApplies ? quality / 100 : undefined,
      });

      // A browser that cannot encode WebP gets the PNG fallback from the
      // exporter; the swap is announced as its own notice — the export
      // succeeded, so it is not the error state (ADR-007).
      if (artifact.format !== format) {
        setNotice(copy.canvas.exportFallbackToPng);
      }

      downloadArtifact(artifact);
    } catch (exportFailure) {
      console.error('Failed to export the page:', exportFailure);
      setError(copy.canvas.exportError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="flex flex-col"
      aria-label={copy.editor.sections.export}
      data-testid="export-panel"
    >
      <h2 className="px-1 text-sm font-semibold tracking-tight">{copy.editor.sections.export}</h2>

      <div className="mt-2 space-y-3">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
            {copy.canvas.exportFormat}
          </span>
          <Select value={format} onValueChange={(value) => setFormat(requireExportFormat(value).id)}>
            <SelectTrigger
              aria-label={copy.canvas.exportFormat}
              data-testid="export-format"
              className="h-9 rounded-[0.9rem]"
            >
              <SelectValue placeholder={copy.canvas.exportFormat} />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_FORMATS.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.id.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
            {copy.controls.scale}
          </span>
          <Select
            value={String(scale)}
            onValueChange={(value) => setScale(toExportScale(value))}
            disabled={!definition.raster}
          >
            <SelectTrigger
              aria-label={copy.controls.scale}
              data-testid="export-scale"
              className="h-9 rounded-[0.9rem]"
            >
              <SelectValue placeholder={copy.controls.scale} />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_SCALES.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
            {copy.canvas.exportQuality}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
              disabled={!qualityApplies}
              aria-label={copy.canvas.exportQuality}
              data-testid="export-quality"
              className="min-w-0 flex-1 accent-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-[hsl(var(--text-muted))]">
              {quality}%
            </span>
          </div>
        </div>

        <Button
          className="h-11 w-full rounded-2xl"
          onClick={handleExport}
          disabled={busy}
          data-testid="export-button"
        >
          <ExportPanelIcon className="mr-2 h-4 w-4" />
          {busy ? copy.canvas.exporting : copy.canvas.exportPage}
        </Button>

        <p className="text-xs leading-5 text-[hsl(var(--text-muted))]">{copy.canvas.exportHint}</p>
        {notice && (
          <p
            role="status"
            data-testid="export-notice"
            className="text-xs leading-5 text-[hsl(var(--text-muted))]"
          >
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
