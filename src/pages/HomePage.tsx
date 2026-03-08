import { SourceControls } from '@/components/editor/ImageUpload';
import { useI18n } from '@/i18n/useI18n';

export function HomePage() {
  const { copy } = useI18n();

  return (
    <main className="flex flex-1 items-center">
      <section className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full space-y-6">
          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">{copy.home.title}</h1>
            <p className="max-w-xl text-base text-[hsl(var(--text-muted))] md:text-lg">{copy.home.subtitle}</p>
          </div>

          <SourceControls variant="home" />
        </div>
      </section>
    </main>
  );
}
