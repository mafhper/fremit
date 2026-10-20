/**
 * HomePage.tsx
 * Entrada do Fremit: o shader ocupa a tela e uma prancheta de canvas recebe link ou imagem.
 * Imagem solta/colada é emoldurada ali mesmo (com exportação em PNG) e pode seguir para o
 * editor; link e "Abrir no editor" usam o mesmo fluxo de fonte do restante do app.
 */

import { useEffect, useRef, useState } from 'react';
import { Artboard, type ArtboardHandle } from '@/components/canvas/Artboard';
import { ArtboardDock } from '@/components/canvas/ArtboardDock';
import { composeArtboardExport, canvasToBlob } from '@/components/canvas/exportComposite';
import {
  ARTBOARD_FORMATS,
  DEFAULT_ARTBOARD_FORMAT,
  computeExportLayout,
  getArtboardFormat,
  type ArtboardFormatId,
} from '@/components/canvas/formats';
import { LiquidMeshBackdrop, type LiquidMeshHandle } from '@/components/hero/LiquidMeshBackdrop';
import type { LiquidMood } from '@/components/hero/presets';
import { Button } from '@/components/ui';
import { useSourceEntry } from '@/hooks/useSourceEntry';
import { useI18n } from '@/i18n/useI18n';
import { saveBlob } from '@/lib/saveBlob';
import { useStore } from '@/store/useStore';
import type { ThemePreference } from '@/types/app';

interface Preview {
  file: File;
  src: string;
}

interface MoodPick {
  mood: LiquidMood;
  /** Tema vigente quando o clima foi escolhido; se o tema mudar por outro caminho, o clima expira. */
  theme: ThemePreference;
}

export function HomePage() {
  const { copy } = useI18n();
  const entry = useSourceEntry();
  const themePreference = useStore((state) => state.appShell.themePreference);
  const setThemePreference = useStore((state) => state.setThemePreference);

  const backdropRef = useRef<LiquidMeshHandle>(null);
  const artboardRef = useRef<ArtboardHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ArtboardFormatId>(DEFAULT_ARTBOARD_FORMAT);
  const [pick, setPick] = useState<MoodPick | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Libera a URL do arquivo quando a prévia muda ou a página é desmontada.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.src);
    };
  }, [preview]);

  const mood: LiquidMood | undefined = pick && pick.theme === themePreference ? pick.mood : undefined;
  const activeMood: LiquidMood = mood ?? (themePreference === 'dark' ? 'night' : 'morning');

  const chooseMood = (next: LiquidMood) => {
    // Manhã é um clima claro; Noite e Cromo são escuros. O tema acompanha para manter o contraste do texto.
    const theme: ThemePreference = next === 'morning' ? 'light' : 'dark';
    setThemePreference(theme);
    setPick({ mood: next, theme });
  };

  const frameFile = (file: File) => {
    setNotice(null);
    setPreview({ file, src: URL.createObjectURL(file) });
  };

  const clearPreview = () => {
    setNotice(null);
    setPreview(null);
  };

  const exportPng = async () => {
    const geometry = artboardRef.current?.getGeometry();
    const layout = geometry ? computeExportLayout(getArtboardFormat(format), geometry.artboard, geometry.device) : null;
    if (!geometry || !layout || !preview) {
      setNotice(copy.canvas.exportFailed);
      return;
    }

    try {
      const backdrop = backdropRef.current?.capture(geometry.artboard) ?? null;
      const canvas = composeArtboardExport({
        layout,
        backdrop,
        fallbackColor: themePreference === 'dark' ? '#0b1020' : '#cfe5fb',
        image: geometry.image,
        title: preview.file.name,
      });
      saveBlob(await canvasToBlob(canvas), `fremit-${format}.png`);
      setNotice(null);
    } catch {
      setNotice(copy.canvas.exportFailed);
    }
  };

  const words = copy.home.title.split(/\s+/);
  const lastWord = words.length > 1 ? words.pop() : null;
  const hasUrlValue = entry.source.draftUrl.trim().length > 0;

  return (
    <main className="relative isolate h-full overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <LiquidMeshBackdrop ref={backdropRef} variant="home" mood={mood} />
        <div className="absolute inset-0 z-2 bg-gradient-to-b from-[hsl(var(--background)/0.02)] to-[hsl(var(--background)/0.8)]" />
      </div>

      <section className="hero relative z-10 flex h-full flex-col items-center justify-center px-4">
        <Artboard
          ref={artboardRef}
          className="[--artboard-max-h:46svh]"
          format={format}
          formatLabel={copy.canvas.formats[format]}
          dropLabel={copy.canvas.drop}
          image={preview ? { src: preview.src, name: preview.file.name } : null}
          onFile={frameFile}
          empty={
            <div className="artboard__stack" data-testid="home-source">
              <h1 className="artboard__title">
                {words.join(' ')}
                {lastWord ? <> <em>{lastWord}</em></> : null}
              </h1>
              <p className="artboard__lead artboard__secondary" data-testid="home-subtitle">
                {copy.home.subtitle}
              </p>

              <form className="artboard__form" onSubmit={entry.handleUrlSubmit}>
                <input
                  id="source-url"
                  type="text"
                  inputMode="url"
                  aria-label={copy.source.label}
                  placeholder={copy.source.placeholder}
                  value={entry.source.draftUrl}
                  onChange={(event) => entry.setDraftUrl(event.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full"
                  aria-label={copy.source.submit}
                  disabled={!hasUrlValue || entry.isLoading}
                >
                  {entry.isLoading ? '…' : '→'}
                </Button>
              </form>

              <div className="artboard__secondary">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => fileInputRef.current?.click()}>
                  {copy.source.upload}
                </Button>
              </div>

              {entry.source.errorMessage ? (
                <p role="alert" className="text-sm text-destructive">
                  {entry.source.errorMessage}
                </p>
              ) : null}
            </div>
          }
          actions={
            <>
              <Button type="button" className="rounded-full" onClick={exportPng}>
                {copy.canvas.exportPng}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={entry.isLoading}
                onClick={() => preview && entry.handleFile(preview.file)}
              >
                {copy.canvas.openInEditor}
              </Button>
              <Button type="button" variant="ghost" className="rounded-full" onClick={clearPreview}>
                {copy.canvas.clear}
              </Button>
              {notice ? (
                <span role="alert" className="self-center text-sm text-destructive">
                  {notice}
                </span>
              ) : null}
            </>
          }
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          aria-label={copy.source.upload}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) frameFile(file);
            event.target.value = '';
          }}
        />

        <ArtboardDock
          className="absolute bottom-4"
          label={copy.canvas.dockLabel}
          formatLabel={copy.canvas.formatsLabel}
          moodLabel={copy.canvas.moodLabel}
          formats={ARTBOARD_FORMATS.map((item) => ({ id: item.id, label: copy.canvas.formats[item.id] }))}
          format={format}
          onFormatChange={setFormat}
          moods={(['morning', 'night', 'chrome'] as const).map((id) => ({ id, label: copy.canvas.moods[id] }))}
          mood={activeMood}
          onMoodChange={chooseMood}
        />
      </section>
    </main>
  );
}
