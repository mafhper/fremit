/**
 * saveBlob.ts
 * Salva um Blob como arquivo. Na web usa um link temporário com `download`.
 * No app desktop (Tauri) este é o ponto onde entram plugin-dialog + plugin-fs,
 * porque a webview não trata `download` de forma confiável. O adiamento e o
 * critério pendente estão em docs/adr/ADR-009-export-desktop.md.
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
