import { SourceControls } from '@/components/editor/ImageUpload';
import { LiquidMeshBackdrop } from '@/components/hero/LiquidMeshBackdrop';
import { useI18n } from '@/i18n/useI18n';

export function HomePage() {
  const { copy } = useI18n();

  return (
    <main className="flex flex-1 flex-col">
      <section className="hero relative flex flex-1 flex-col overflow-hidden min-h-svh">
        <LiquidMeshBackdrop />
        <div className="hero-fade" aria-hidden="true" />
        <div className="hero__content">
          <div className="flex flex-col items-center justify-center gap-10 py-8">
            <div className="flex flex-col items-center gap-4">
              <h1 className="text-5xl font-bold tracking-tight md:text-7xl">{copy.home.title}</h1>
              <p className="max-w-xl text-lg/7 text-[hsl(var(--foreground)/0.82)] md:text-xl/8">
                {copy.home.subtitle}
              </p>
            </div>
            <div className="w-full max-w-lg px-2">
              <SourceControls variant="home" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
