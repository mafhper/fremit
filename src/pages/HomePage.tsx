import { SourceControls } from '@/components/editor/ImageUpload';
import { useI18n } from '@/i18n/useI18n';

export function HomePage() {
  const { copy } = useI18n();

  return (
    <main className="flex flex-1 items-center">
      <section className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full space-y-6">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{copy.home.title}</h1>
            <p className="text-base text-[hsl(var(--text-muted))] md:text-lg">{copy.home.subtitle}</p>
          </div>

          <div className="mx-auto max-w-4xl">
            <SourceControls variant="home" />
          </div>
        </div>
      </section>
    </main>
  );
}
