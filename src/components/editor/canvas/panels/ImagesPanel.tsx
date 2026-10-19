/**
 * Images drawer of the canvas shell: three insertion paths — upload, URL and
 * clipboard — that all land in the document through `upsertSourceImage`, so a
 * source already on the page is selected again instead of duplicated. Every
 * path goes through the shared source gate (`imageSource`): the acceptance
 * matrix is the same one the image replacement and the page background
 * consult, and a refusal never reaches the document.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { RuneClipboardIcon } from '@/components/icons/rune/Clipboard';
import { RuneCloudUploadIcon } from '@/components/icons/rune/CloudUpload';
import { RuneLink2Icon } from '@/components/icons/rune/Link2';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import {
  IMAGE_SOURCE_ACCEPT,
  ImageSourceError,
  imageSourceErrorMessage,
  resolveImageSourceFile,
  resolveImageSourceUrl,
} from '@/lib/imageSource';
import { getUrlTitle } from '@/lib/sourceResolver';
import { useStore } from '@/store/useStore';

export function ImagesPanel() {
  const { copy } = useI18n();
  const upsertSourceImage = useStore((state) => state.upsertSourceImage);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insertImage = (src: string, name: string) => {
    setError(null);
    upsertSourceImage(src, name);
  };

  /** Localized message of a refused source; the code is the contract. */
  const errorMessage = (failure: unknown) =>
    failure instanceof ImageSourceError
      ? imageSourceErrorMessage(failure.code, copy.images)
      : copy.images.error;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      insertImage(await resolveImageSourceFile(file), file.name);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const handleUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      insertImage(await resolveImageSourceUrl(trimmed), getUrlTitle(trimmed));
      setUrl('');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const handlePaste = async () => {
    if (busy) return;

    if (!navigator.clipboard?.read) {
      setError(copy.images.error);
      return;
    }

    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        const type = item.types.find((candidate) => candidate.startsWith('image/'));
        if (!type) continue;

        const blob = await item.getType(type);
        const file = new File([blob], 'Pasted image', { type });

        insertImage(await resolveImageSourceFile(file), file.name);
        return;
      }

      setError(copy.images.emptyClipboard);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        data-testid="images-upload"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 w-full justify-start gap-2 rounded-[0.9rem]"
      >
        <RuneCloudUploadIcon className="h-4 w-4" aria-hidden="true" />
        {copy.images.upload}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_SOURCE_ACCEPT}
        aria-label={copy.images.upload}
        data-testid="images-file"
        className="hidden"
        onChange={handleFile}
      />

      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
          {copy.images.url}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={copy.images.urlPlaceholder}
            aria-label={copy.images.url}
            data-testid="images-url"
            spellCheck={false}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-[0.9rem] border border-border/70 bg-background px-2 text-xs text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
          />
          <Button
            type="button"
            data-testid="images-add-url"
            onClick={handleUrl}
            disabled={busy || url.trim() === ''}
            className="h-9 shrink-0 gap-1.5 rounded-[0.9rem] px-3"
          >
            <RuneLink2Icon className="h-4 w-4" aria-hidden="true" />
            {copy.images.addUrl}
          </Button>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        data-testid="images-paste"
        onClick={handlePaste}
        className="h-9 w-full justify-start gap-2 rounded-[0.9rem]"
      >
        <RuneClipboardIcon className="h-4 w-4" aria-hidden="true" />
        {copy.images.paste}
      </Button>

      {error && (
        <p role="alert" data-testid="images-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
