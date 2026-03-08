import { Link } from 'react-router-dom';
import { BrowserPanelIcon, ExportPanelIcon, SourcePanelIcon } from '@/components/icons/AppIcons';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';

const icons = [SourcePanelIcon, BrowserPanelIcon, ExportPanelIcon];

export function AboutPage() {
  const { copy } = useI18n();

  return (
    <main className="flex flex-1">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--text-soft))]">
            {copy.about.eyebrow}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{copy.about.title}</h1>
          <p className="text-base leading-7 text-[hsl(var(--text-muted))] md:text-lg">{copy.about.intro}</p>
          <Button asChild className="rounded-full px-5">
            <Link to="/editor">{copy.nav.openApp}</Link>
          </Button>
        </div>

        <section className="mt-10 surface-card rounded-[1.9rem] border p-5 md:p-7">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">{copy.about.workflowTitle}</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {copy.about.workflow.map((section, index) => {
              const Icon = icons[index] ?? SourcePanelIcon;

              return (
                <article
                  key={section.title}
                  className="surface-muted rounded-[1.4rem] border p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--surface))] text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight">{section.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))]">{section.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 surface-card rounded-[1.9rem] border p-6 md:p-7">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">{copy.about.featuresTitle}</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {copy.about.features.map((section) => (
              <article key={section.title} className="rounded-[1.2rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.68] p-5">
                <h3 className="text-xl font-semibold tracking-tight">{section.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))]">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
