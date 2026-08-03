import { SourceControls } from '@/components/editor/ImageUpload';
import { LiquidMeshBackdrop } from '@/components/hero/LiquidMeshBackdrop';
import { useI18n } from '@/i18n/useI18n';

export function HomePage() {
  const { copy } = useI18n();

  return (
    <main className="relative isolate h-full overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <LiquidMeshBackdrop variant="home" />
        <div className="absolute inset-0 z-2 bg-gradient-to-b from-[hsl(var(--background)/0.02)] to-[hsl(var(--background)/0.8)]" />
      </div>

      <section className="hero relative flex h-full flex-col items-center justify-center z-10">
        <div className="hero__content w-full">
          <div className="flex flex-col items-center justify-center gap-10 py-8">
            <div className="flex flex-col items-center gap-6">
              <h1 className="text-5xl font-bold tracking-tight md:text-8xl">{copy.home.title}</h1>
              <p className="max-w-2xl text-lg/7 text-[hsl(var(--foreground)/0.82)] md:text-2xl/9" data-testid="home-subtitle">
                {copy.home.subtitle}
              </p>
            </div>
            <div className="w-full max-w-2xl px-4">
              <SourceControls variant="home" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
