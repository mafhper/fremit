import { MainLayout } from '@/components/layout/MainLayout';

/**
 * `/mockup` — the mockup composer (source + frame + background + export via
 * `html-to-image`). It keeps working untouched while the dedicated canvas at
 * `/editor` grows; the export from the Documento JSON replaces it in F1.7.
 */
export function MockupPage() {
  return <MainLayout />;
}
