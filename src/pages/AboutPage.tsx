import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BrowserPanelIcon,
  ExportPanelIcon,
  GitHubPanelIcon,
  SourcePanelIcon,
} from "@/components/icons/AppIcons";
import { Button } from "@/components/ui";
import { LiquidMeshBackdrop } from "@/components/hero/LiquidMeshBackdrop";
import { useI18n } from "@/i18n/useI18n";

const icons = [SourcePanelIcon, BrowserPanelIcon, ExportPanelIcon];

function useAboutScrollAtmosphere() {
  useEffect(() => {
    let raf = 0;
    let lastScroll = -1;

    const update = () => {
      raf = 0;
      const currentScroll = window.scrollY;
      if (Math.abs(currentScroll - lastScroll) < 2) return;
      lastScroll = currentScroll;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, currentScroll / max) : 0;

      const blur = Math.floor(progress * 16);
      const veil = 0.05 + progress * 0.25;

      document.documentElement.style.setProperty('--about-bg-blur', `${blur}px`);
      document.documentElement.style.setProperty('--about-bg-veil', String(veil));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty('--about-bg-blur');
      document.documentElement.style.removeProperty('--about-bg-veil');
    };
  }, []);
}

function AccordionItem({
  answer,
  answerId,
  isOpen,
  onToggle,
  question,
  questionId,
}: {
  answer: string;
  answerId: string;
  isOpen: boolean;
  onToggle: () => void;
  question: string;
  questionId: string;
}) {
  return (
    <article className="about-card rounded-[1.25rem]">
      <h2>
        <button
          id={questionId}
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-expanded={isOpen}
          aria-controls={answerId}
        >
          <span className="text-lg font-semibold tracking-tight md:text-xl">
            {question}
          </span>
          <span className="relative h-5 w-5 shrink-0">
            <span className="absolute left-0 top-1/2 h-[1.5px] w-5 -translate-y-1/2 rounded-full bg-[hsl(var(--text-soft))]" />
            <span
              className={cn(
                "absolute left-1/2 top-0 h-5 w-[1.5px] -translate-x-1/2 rounded-full bg-[hsl(var(--text-soft))] transition-opacity",
                isOpen ? "opacity-0" : "opacity-100"
              )}
            />
          </span>
        </button>
      </h2>

      {isOpen && (
        <div
          id={answerId}
          role="region"
          aria-labelledby={questionId}
          className="border-t border-border/40 px-5 py-4 text-sm leading-7 text-[hsl(var(--text-muted))]"
        >
          {answer}
        </div>
      )}
    </article>
  );
}

export function AboutPage() {
  const { copy } = useI18n();
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  
  useAboutScrollAtmosphere();

  const toggleQuestion = (question: string) => {
    setOpenQuestions((current) =>
      current.includes(question)
        ? current.filter((item) => item !== question)
        : [...current, question],
    );
  };

  return (
    <main className="about-page relative isolate min-h-svh overflow-x-hidden">
      {/* Background Layer */}
      <div className="about-page__backdrop" aria-hidden="true">
        <LiquidMeshBackdrop interactive={false} variant="about" />
        <div className="about-page__scrim" />
        <div className="about-page__scroll-blur" />
      </div>

      {/* Hero Section */}
      <section className="hero relative flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="relative z-10 max-w-3xl space-y-4 px-4 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--text-soft))]">
            {copy.about.eyebrow}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {copy.about.title}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-[hsl(var(--foreground)/0.82)] md:text-xl/8">
            {copy.about.intro}
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
        <section
          id="workflow"
          className="about-card rounded-[2.25rem] p-6 md:p-10"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {copy.about.workflowTitle}
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {copy.about.workflow.map((section, index) => {
              const Icon = icons[index] ?? SourcePanelIcon;

              return (
                <article
                  key={section.title}
                  className="about-card about-card-muted rounded-[1.75rem] p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--surface)/0.5)] text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight">
                    {section.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))]">
                    {section.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="features"
          className="mt-12 about-card rounded-[2.25rem] p-6 md:p-10"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {copy.about.featuresTitle}
            </h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {copy.about.features.map((section) => (
              <article
                key={section.title}
                className="about-card about-card-muted rounded-[1.5rem] p-6"
              >
                <h3 className="text-xl font-semibold tracking-tight">
                  {section.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))]">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-20 scroll-mt-24">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {copy.about.faq.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-[hsl(var(--text-muted))] md:text-lg">
              {copy.about.faq.intro}
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {copy.about.faq.questions.map((item, index) => (
              <AccordionItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                questionId={`faq-question-${index}`}
                answerId={`faq-answer-${index}`}
                isOpen={openQuestions.includes(item.question)}
                onToggle={() => toggleQuestion(item.question)}
              />
            ))}
          </div>

          <div className="mt-16 about-card rounded-[2.25rem] p-6 md:p-10">
            <div className="max-w-3xl">
              <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {copy.about.faq.limitationsTitle}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                {copy.about.faq.limitationsIntro}
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {copy.about.faq.limitations.map((item) => (
                <article
                  key={item.question}
                  className="about-card about-card-muted rounded-[1.5rem] p-6"
                >
                  <h3 className="text-lg font-semibold tracking-tight md:text-xl">
                    {item.question}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))]">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="developer"
          className="mt-20 about-card rounded-[2.25rem] p-6 md:p-10"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <img
                src={__APP_DEVELOPER__.avatarUrl}
                alt={__APP_DEVELOPER__.name}
                className="h-20 w-20 rounded-2xl border border-border/40 object-cover shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight">
                  {copy.about.developerTitle}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                  {copy.about.developerBody}
                </p>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                  {copy.about.developerOpenSource}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full px-6 py-6 text-base">
                <a
                  href={__APP_DEVELOPER__.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <GitHubPanelIcon className="mr-2 h-5 w-5" />
                  GitHub
                </a>
              </Button>
              <Button asChild className="rounded-full px-6 py-6 text-base">
                <a
                  href={__APP_DEVELOPER__.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.about.developerProjects}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
