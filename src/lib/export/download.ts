/**
 * Browser download of an export artifact: object URL plus a synthetic anchor
 * click. The anchor is attached to the DOM for the click — Safari and Firefox
 * ignore the click of a detached anchor.
 * O caminho desktop (plugin-dialog + plugin-fs) e o motivo de ele ser adiado
 * estão em docs/adr/ADR-009-export-desktop.md.
 */

import type { ExportArtifact } from '@/lib/export/exporter';

/** Delay before the object URL is revoked, so the download can start first. */
const REVOKE_DELAY_MS = 10_000;

export function downloadArtifact(artifact: ExportArtifact): void {
  const url = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = artifact.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
