import { useState } from "react";

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
    <article className="surface-card rounded-[1.25rem] border">
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
              className={`absolute left-1/2 top-0 h-5 w-[1.5px] -translate-x-1/2 rounded-full bg-[hsl(var(--text-soft))] transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`}
            />
          </span>
        </button>
      </h2>

      {isOpen && (
        <div
          id={answerId}
          role="region"
          aria-labelledby={questionId}
          className="border-t border-border/80 px-5 py-4 text-sm leading-7 text-[hsl(var(--text-muted))]"
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

  const toggleQuestion = (question: string) => {
    setOpenQuestions((current) =>
      current.includes(question)
        ? current.filter((item) => item !== question)
        : [...current, question],
    );
  };

  return (
    <main className="flex flex-1 flex-col">
      <section className="hero relative min-h-[55vh] overflow-hidden">
        <LiquidMeshBackdrop />
        <div className="hero-fade" aria-hidden="true" />
        <div className="hero__content">
          <div className="max-w-2xl space-y-4 py-8 md:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--text-soft))]">
              {copy.about.eyebrow}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              {copy.about.title}
            </h1>
            <p className="text-base leading-7 text-[hsl(var(--foreground)/0.82)] md:text-lg/8">
              {copy.about.intro}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6 md:pb-14">
        <section
          id="workflow"
          className="surface-card rounded-[1.9rem] border p-5 md:p-7"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">
              {copy.about.workflowTitle}
            </h2>
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
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight">
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
          className="mt-10 surface-card rounded-[1.9rem] border p-6 md:p-7"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">
              {copy.about.featuresTitle}
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {copy.about.features.map((section) => (
              <article
                key={section.title}
                className="rounded-[1.2rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.68] p-5"
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

        <section id="faq" className="mt-10 scroll-mt-24">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {copy.about.faq.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-[hsl(var(--text-muted))] md:text-lg">
              {copy.about.faq.intro}
            </p>
          </div>

          <div className="mt-8 space-y-3">
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

          <div className="mt-12 surface-muted rounded-[1.75rem] border p-6 md:p-7">
            <div className="max-w-3xl">
              <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {copy.about.faq.limitationsTitle}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                {copy.about.faq.limitationsIntro}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {copy.about.faq.limitations.map((item) => (
                <article
                  key={item.question}
                  className="rounded-[1.25rem] border border-border/70 bg-[hsl(var(--surface))/0.66] p-5"
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
          className="mt-10 surface-card rounded-[1.9rem] border p-6 md:p-7"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <img
                src={__APP_DEVELOPER__.avatarUrl}
                alt={__APP_DEVELOPER__.name}
                className="h-16 w-16 rounded-2xl border border-border/70 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight">
                  {copy.about.developerTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                  {copy.about.developerBody}
                </p>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                  {copy.about.developerOpenSource}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full px-5">
                <a
                  href={__APP_DEVELOPER__.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <GitHubPanelIcon className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <Button asChild className="rounded-full px-5">
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
