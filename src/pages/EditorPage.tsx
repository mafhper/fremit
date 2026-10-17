import { CanvasEditor } from '@/components/editor/canvas/CanvasEditor';

/**
 * `/editor` — dedicated canvas over the Documento JSON. The mockup composer
 * lives at `/mockup` until the export from the document replaces it (F1.7).
 */
export function EditorPage() {
  return <CanvasEditor />;
}
