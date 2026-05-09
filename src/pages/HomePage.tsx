import { SourceControls } from '@/components/editor/ImageUpload';
import { LiquidMeshBackdrop } from '@/components/hero/LiquidMeshBackdrop';
import { useI18n } from '@/i18n/useI18n';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export function HomePage() {
  const { copy } = useI18n();

  return (
    <main className="flex flex-1 flex-col">
      <section className="hero relative flex flex-1 flex-col">
        <LiquidMeshBackdrop />
        <div className="hero__content flex-1">
          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">{copy.home.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-[hsl(var(--text-muted))] md:text-xl">
            {copy.home.subtitle}
          </p>
          <Button asChild className="mt-8 rounded-full px-8 py-3 text-base">
            <Link to="/editor">{copy.nav.openApp}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto max-w-4xl">
          <SourceControls variant="home" />
        </div>
      </section>
    </main>
  );
}
