import { useState } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { ExportPanelIcon } from '@/components/icons/AppIcons';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';

export function DownloadButton() {
  const { copy } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const frameTitle = useStore((state) => state.frame.windowTitle);
  const exportConfig = useStore((state) => state.export);
  const updateExport = useStore((state) => state.updateExport);

  const handleDownload = async () => {
    const node = document.getElementById('fremit-preview');
    if (!node) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const options = {
        quality: 0.96,
        pixelRatio: exportConfig.scale,
        cacheBust: true,
        skipFonts: false,
      };

      const dataUrl =
        exportConfig.format === 'png'
          ? await toPng(node, options)
          : await toJpeg(node, options);

      const filenameBase =
        frameTitle
          .toLowerCase()
          .replace(/[^a-z0-9.-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '') || 'fremit-export';

      const anchor = document.createElement('a');
      anchor.download = `${filenameBase}.${exportConfig.format}`;
      anchor.href = dataUrl;
      anchor.click();
    } catch (error) {
      console.error('Failed to export image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">{copy.controls.format}</label>
          <Select value={exportConfig.format} onValueChange={(value: 'png' | 'jpeg') => updateExport({ format: value })}>
            <SelectTrigger className="rounded-2xl" aria-label={copy.controls.format}>
              <SelectValue placeholder={copy.controls.format} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpeg">JPG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">{copy.controls.scale}</label>
          <Select value={String(exportConfig.scale)} onValueChange={(value) => updateExport({ scale: Number(value) as 1 | 2 | 3 })}>
            <SelectTrigger className="rounded-2xl" aria-label={copy.controls.scale}>
              <SelectValue placeholder={copy.controls.scale} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="3">3x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="h-12 w-full rounded-2xl" onClick={handleDownload} disabled={isLoading}>
        <ExportPanelIcon className="mr-2 h-4 w-4" />
        {isLoading ? `${copy.controls.exportButton}...` : copy.controls.exportButton}
      </Button>

      <p className="text-sm leading-6 text-[hsl(var(--text-muted))]">{copy.controls.exportHint}</p>
    </div>
  );
}
