/**
 * saveBlob.ts
 * Salva um Blob como arquivo. Na web usa um link temporário com `download`.
 * No app desktop (Tauri) este é o ponto onde entram plugin-dialog + plugin-fs (ver TAURI.md),
 * porque a webview não trata `download` de forma confiável.
 */

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
