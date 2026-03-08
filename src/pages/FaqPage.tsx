import { useState } from 'react';
import { useI18n } from '@/i18n/useI18n';

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
          <span className="text-lg font-semibold tracking-tight md:text-xl">{question}</span>
          <span className="relative h-5 w-5 shrink-0">
            <span className="absolute left-0 top-1/2 h-[1.5px] w-5 -translate-y-1/2 rounded-full bg-[hsl(var(--text-soft))]" />
            <span
              className={`absolute left-1/2 top-0 h-5 w-[1.5px] -translate-x-1/2 rounded-full bg-[hsl(var(--text-soft))] transition-opacity ${isOpen ? 'opacity-0' : 'opacity-100'}`}
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

export function FaqPage() {
  const { copy } = useI18n();
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);

  const toggleQuestion = (question: string) => {
    setOpenQuestions((current) =>
      current.includes(question) ? current.filter((item) => item !== question) : [...current, question],
    );
  };

  return (
    <main className="flex flex-1">
      <section className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--text-soft))]">
            {copy.faq.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{copy.faq.title}</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--text-muted))] md:text-lg">{copy.faq.intro}</p>
        </div>

        <section className="mt-8 space-y-3">
          {copy.faq.questions.map((item, index) => (
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
        </section>

        <section className="mt-12">
          <div className="surface-muted rounded-[1.75rem] border p-6 md:p-7">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{copy.faq.limitationsTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))] md:text-base">
                {copy.faq.limitationsIntro}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {copy.faq.limitations.map((item) => (
                <article key={item.question} className="rounded-[1.25rem] border border-border/70 bg-[hsl(var(--surface))/0.66] p-5">
                  <h3 className="text-lg font-semibold tracking-tight md:text-xl">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[hsl(var(--text-muted))]">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
