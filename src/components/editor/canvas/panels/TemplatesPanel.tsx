/**
 * Templates sidebar of the canvas shell: the own gallery (twenty-eight
 * starters — ten generic compositions, the six README hero presets and the
 * three animated hero presets, the README demo, the two animated demo presets
 * and the sponsors section, the release notes, the three profile hero presets
 * and the illustrated section title (the partial one) — and the GitHub project
 * template, grouped into the collapsible sections of `TEMPLATE_SECTIONS`: one
 * accordion per family, the first family open on mount, every header a real
 * button carrying the chevron and `aria-expanded`. A card shows a live SVG
 * preview of its own seed (`pageToSvg`) and applying it appends the built page
 * through the store — the seed lands as a normal page of the Documento JSON,
 * so it edits and exports like any other page.
 *
 * The GitHub card can fill its slots from the public API at runtime: the repo
 * input goes through `fetchRepoSummary`, which never throws. A loaded repo
 * lives in the store, so the card's thumbnail and the seed it applies carry
 * the provided data — across tool switches — until the input changes or the
 * data is cleared. Offline (or with an invalid repo) the template still
 * applies, with placeholders, and the status line says so — the gallery never
 * depends on the network.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { RuneChevronDownIcon } from '@/components/icons/rune/ChevronDown';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import { fetchRepoSummary } from '@/lib/githubRepo';
import { pageToSvg } from '@/lib/templateThumbnail';
import {
  GITHUB_SECTION_ID,
  GITHUB_TEMPLATE_ID,
  TEMPLATES,
  TEMPLATE_SECTIONS,
  buildGithubProjectDocument,
  type TemplateDefinition,
  type TemplateId,
  type TemplateSectionId,
} from '@/lib/templates';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const CARD_CLASS = cn(
  'flex flex-col gap-1.5 rounded-[0.9rem] border border-border/70 bg-background p-2 text-left transition',
  'hover:border-accent/50 hover:bg-[hsl(var(--surface-muted))/0.6]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const THUMBNAIL_CLASS =
  'block h-20 w-full overflow-hidden rounded-[0.7rem] border border-border/60 bg-[hsl(var(--surface-muted))/0.5] [&>svg]:h-full [&>svg]:w-full';

const TOGGLE_CLASS = cn(
  'flex w-full items-center justify-between gap-2 rounded-[0.9rem] px-2 py-1.5 text-left transition',
  'hover:bg-[hsl(var(--surface-muted))/0.6]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const SECTION_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]';

interface TemplateAccordionSectionProps {
  sectionId: TemplateSectionId;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * One collapsible family of the gallery: the header button — the chevron plus
 * `aria-expanded`, the accessible name of the section — and the region it
 * controls, rendered only while open so a collapsed family costs no DOM. The
 * header is a native button, so Enter and Space toggle it with no key handler.
 */
function TemplateAccordionSection({
  sectionId,
  label,
  open,
  onToggle,
  children,
}: TemplateAccordionSectionProps) {
  const toggleId = `template-section-${sectionId}-toggle`;
  const contentId = `template-section-${sectionId}-content`;

  return (
    <section data-testid={`template-section-${sectionId}`}>
      <h3>
        <button
          type="button"
          id={toggleId}
          data-testid={`template-section-toggle-${sectionId}`}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
          className={TOGGLE_CLASS}
        >
          <span className={SECTION_LABEL_CLASS}>{label}</span>
          <RuneChevronDownIcon
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[hsl(var(--text-soft))] transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </button>
      </h3>

      {open && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={toggleId}
          data-testid={`template-section-content-${sectionId}`}
          className="mt-2"
        >
          {children}
        </div>
      )}
    </section>
  );
}

export function TemplatesPanel() {
  const { copy } = useI18n();
  const addTemplatePage = useStore((state) => state.addTemplatePage);
  const githubRepo = useStore((state) => state.githubRepo);
  const setGithubRepo = useStore((state) => state.setGithubRepo);
  // The input starts from the loaded repo: the panel remounts when the user
  // switches tools, and the loaded repo outlives that.
  const [repo, setRepo] = useState(() => githubRepo?.input ?? '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Accordion: one family open at a time, the first of the gallery on mount.
  const [openSectionId, setOpenSectionId] = useState<TemplateSectionId | null>(
    TEMPLATE_SECTIONS[0]?.id ?? null,
  );

  // The summary the gallery reflects: the loaded repo while the input still
  // names it, the placeholders otherwise (the input changed or was cleared).
  const loadedSummary = githubRepo && githubRepo.input === repo.trim() ? githubRepo.summary : null;

  const labels: Record<TemplateId, string> = {
    'social-post': copy.templates.socialPost,
    'quote-card': copy.templates.quoteCard,
    announcement: copy.templates.announcement,
    'event-poster': copy.templates.eventPoster,
    'sale-banner': copy.templates.saleBanner,
    'hero-slide': copy.templates.heroSlide,
    'product-card': copy.templates.productCard,
    'stats-card': copy.templates.statsCard,
    'story-promo': copy.templates.storyPromo,
    'newsletter-header': copy.templates.newsletterHeader,
    'readme-hero-369': copy.templates.readmeHero369,
    'readme-hero-430': copy.templates.readmeHero430,
    'readme-hero-720': copy.templates.readmeHero720,
    'readme-hero-840': copy.templates.readmeHero840,
    'readme-hero-1200': copy.templates.readmeHero1200,
    'readme-hero-fluid-100': copy.templates.readmeHeroFluid100,
    'readme-hero-anim-760': copy.templates.readmeHeroAnim760,
    'readme-hero-anim-800': copy.templates.readmeHeroAnim800,
    'readme-hero-anim-fluid-100': copy.templates.readmeHeroAnimFluid100,
    'readme-demo-600': copy.templates.readmeDemo600,
    'readme-demo-anim-23': copy.templates.readmeDemoAnim23,
    'readme-demo-anim-80': copy.templates.readmeDemoAnim80,
    'sponsors-table': copy.templates.sponsorsTable,
    'release-grade': copy.templates.releaseGrade,
    'profile-hero-640': copy.templates.profileHero640,
    'profile-hero-400': copy.templates.profileHero400,
    'profile-hero-fluid-100': copy.templates.profileHeroFluid100,
    'section-title-illustrated': copy.templates.sectionTitleIllustrated,
    [GITHUB_TEMPLATE_ID]: copy.templates.githubProject,
  };

  // The GitHub family keeps its own label (the section reuses the card name).
  const sectionLabels: Record<TemplateSectionId, string> = {
    own: copy.templates.sectionOwn,
    'readme-hero': copy.templates.sectionReadmeHeroes,
    animated: copy.templates.sectionAnimated,
    'readme-demo': copy.templates.sectionReadmeDemo,
    sponsors: copy.templates.sectionSponsors,
    release: copy.templates.sectionRelease,
    profile: copy.templates.sectionProfile,
    'section-title': copy.templates.sectionTitles,
    github: copy.templates.githubProject,
  };

  // One preview per seed, built once: the card shows the real document (colors,
  // text, geometry) instead of a hand-made picture that could drift from it.
  // The GitHub card is the exception: its preview follows the loaded repo.
  const previews = useMemo(
    () =>
      new Map(
        TEMPLATES.filter((template) => template.id !== GITHUB_TEMPLATE_ID).map((template) => [
          template.id,
          pageToSvg(template.build().pages[0]),
        ]),
      ),
    [],
  );
  const githubPreview = useMemo(
    () => pageToSvg(buildGithubProjectDocument(loadedSummary).pages[0]),
    [loadedSummary],
  );

  const apply = (template: TemplateDefinition) => {
    addTemplatePage(template.build().pages[0]);
  };

  // The GitHub card applies the loaded repo when there is one — the same data
  // its thumbnail shows — and the placeholder seed otherwise.
  const applyGithub = () => {
    addTemplatePage(buildGithubProjectDocument(loadedSummary).pages[0]);
  };

  const applyFromRepo = async () => {
    const trimmed = repo.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setStatus(null);

    const summary = await fetchRepoSummary(trimmed);

    if (summary) {
      setGithubRepo({ input: trimmed, summary });
    }

    addTemplatePage(buildGithubProjectDocument(summary).pages[0]);
    setStatus(summary ? copy.templates.githubFilled : copy.templates.githubFallback);
    setBusy(false);
  };

  const github = TEMPLATES.find((template) => template.id === GITHUB_TEMPLATE_ID);

  if (!github) return null;

  const toggleSection = (sectionId: TemplateSectionId) => {
    setOpenSectionId((current) => (current === sectionId ? null : sectionId));
  };

  return (
    <div className="space-y-4">
      {TEMPLATE_SECTIONS.map((section) => (
        <TemplateAccordionSection
          key={section.id}
          sectionId={section.id}
          label={sectionLabels[section.id]}
          open={openSectionId === section.id}
          onToggle={() => toggleSection(section.id)}
        >
          {section.id === GITHUB_SECTION_ID ? (
            <div className="space-y-2">
              <button
                type="button"
                data-testid={`template-card-${GITHUB_TEMPLATE_ID}`}
                aria-label={labels[GITHUB_TEMPLATE_ID]}
                onClick={applyGithub}
                className={cn(CARD_CLASS, 'w-full')}
              >
                <span
                  aria-hidden="true"
                  className={THUMBNAIL_CLASS}
                  dangerouslySetInnerHTML={{ __html: githubPreview }}
                />
                <span className="block truncate text-xs font-medium">
                  {labels[GITHUB_TEMPLATE_ID]}
                </span>
              </button>

              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void applyFromRepo();
                }}
              >
                <input
                  type="text"
                  value={repo}
                  onChange={(event) => {
                    const value = event.target.value;

                    setRepo(value);

                    // Editing the repo invalidates the loaded data: the card
                    // goes back to the placeholders until the new input loads.
                    if (githubRepo && value.trim() !== githubRepo.input) {
                      setGithubRepo(null);
                      setStatus(null);
                    }
                  }}
                  placeholder={copy.templates.githubRepoPlaceholder}
                  aria-label={copy.templates.githubRepo}
                  data-testid="template-github-repo"
                  spellCheck={false}
                  autoComplete="off"
                  className="h-9 w-full rounded-[0.9rem] border border-border/70 bg-background px-2 text-xs text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
                />
                <Button
                  type="submit"
                  data-testid="template-github-fill"
                  disabled={busy || repo.trim() === ''}
                  className="h-9 w-full rounded-[0.9rem]"
                >
                  {copy.templates.githubFill}
                </Button>
              </form>

              {status && (
                <p
                  role="status"
                  data-testid="template-github-status"
                  className="text-xs text-[hsl(var(--text-muted))]"
                >
                  {status}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {section.templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  data-testid={`template-card-${template.id}`}
                  aria-label={labels[template.id]}
                  onClick={() => apply(template)}
                  className={CARD_CLASS}
                >
                  <span
                    aria-hidden="true"
                    className={THUMBNAIL_CLASS}
                    dangerouslySetInnerHTML={{ __html: previews.get(template.id) ?? '' }}
                  />
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="min-w-0 truncate text-xs font-medium">
                      {labels[template.id]}
                    </span>
                    {template.partial && (
                      <span
                        data-testid={`template-partial-${template.id}`}
                        className="shrink-0 rounded-full border border-border/70 px-1.5 text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--text-muted))]"
                      >
                        {copy.templates.partial}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </TemplateAccordionSection>
      ))}
    </div>
  );
}
