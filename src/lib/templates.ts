/**
 * Own template gallery of the canvas sidebar: twenty-eight Fremit-designed
 * starters — ten generic compositions, the six README hero presets and the
 * three animated hero presets, the README demo, the two animated demo presets
 * and the sponsors section, the release notes, the three profile hero presets
 * and the illustrated section title — and a GitHub project template whose
 * slots can be filled from the public API at runtime.
 *
 * Every seed is built with the `document` factories — never imported JSON from
 * a third party — so a template is a normal page of the Documento JSON and
 * round-trips like any other. `build()` returns a fresh document per call
 * (fresh ids included), which is what lets the same template be applied twice
 * without collisions. The panel inserts the built page through the store.
 *
 * Layer names stay English so the document reads the same in any locale; the
 * gallery labels live in i18n. The GitHub reader is optional by contract: the
 * template always opens, with placeholders when the repo is unreachable.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import {
  createDocument,
  createImageObject,
  createPage,
  createShapeObject,
  createTextObject,
  type DocumentObject,
  type DocumentPage,
  type FremitDocument,
} from '@/lib/document';
import { getPageFormat, type PageFormatId } from '@/lib/documentOps';
import { DEFAULT_LANGUAGE_COLOR, type RepoSummary } from '@/lib/githubRepo';
import { escapeXml } from '@/lib/templateThumbnail';

const SERIF = 'Georgia, "Times New Roman", serif';

export const TEMPLATE_IDS = [
  'social-post',
  'quote-card',
  'announcement',
  'event-poster',
  'sale-banner',
  'hero-slide',
  'product-card',
  'stats-card',
  'story-promo',
  'newsletter-header',
  'readme-hero-369',
  'readme-hero-430',
  'readme-hero-720',
  'readme-hero-840',
  'readme-hero-1200',
  'readme-hero-fluid-100',
  'readme-hero-anim-760',
  'readme-hero-anim-800',
  'readme-hero-anim-fluid-100',
  'readme-demo-600',
  'readme-demo-anim-23',
  'readme-demo-anim-80',
  'sponsors-table',
  'release-grade',
  'profile-hero-640',
  'profile-hero-400',
  'profile-hero-fluid-100',
  'section-title-illustrated',
  'github-project',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * Ids of the animated README hero family (P-webp2 of the webp study): the
 * 760–800 band and the fluid 100%, declared as animated WebP with a named
 * static fallback.
 */
export type ReadmeHeroAnimTemplateId = Extract<TemplateId, `readme-hero-anim-${string}`>;

/** Ids of the README hero family (the declared-width static seeds). */
export type ReadmeHeroTemplateId = Exclude<
  Extract<TemplateId, `readme-hero-${string}`>,
  ReadmeHeroAnimTemplateId
>;

/** Ids of the animated README demo family (P-webp3): the measured 23–80% band. */
export type ReadmeDemoAnimTemplateId = Extract<TemplateId, `readme-demo-anim-${string}`>;

/** Ids of the profile hero family (the measured 369–640 band and the fluid). */
export type ProfileHeroTemplateId = Extract<TemplateId, `profile-hero-${string}`>;

export const GITHUB_TEMPLATE_ID = 'github-project' as const;

/**
 * Families of the gallery, as the collapsible sections of the panel render
 * them, in reading order: the ten own starters first (the section the gallery
 * opens on), the README families after them — the static heroes, the animated
 * pair (hero and demo variants together), the static demo, the sponsors
 * section and the release notes — then the profile family and the illustrated
 * section title, with the GitHub project closing the gallery.
 */
export const TEMPLATE_SECTION_IDS = [
  'own',
  'readme-hero',
  'animated',
  'readme-demo',
  'sponsors',
  'release',
  'profile',
  'section-title',
  'github',
] as const;

export type TemplateSectionId = (typeof TEMPLATE_SECTION_IDS)[number];

/**
 * The family that owns the GitHub project template: its section renders the
 * card with the repo fill controls instead of a plain card grid.
 */
export const GITHUB_SECTION_ID: TemplateSectionId = 'github';

export interface TemplateDefinition {
  id: TemplateId;
  /** Collapsible family of the gallery the seed belongs to. */
  section: TemplateSectionId;
  /**
   * Page geometry the seed is designed for, in page pixels. The ten generic
   * starters resolve it from one of the standard `PageFormatId`s; the README
   * seeds — the hero family, the demo and the sponsors section — declare their
   * own size (the width is the declared `<img width>` of the preset) and the
   * test compares the built page against it.
   */
  size: { width: number; height: number };
  /** Builds a fresh seed document (new ids per call) for the format. */
  build: () => FremitDocument;
  /**
   * Marks a preset that reads as an illustrated section title (logo +
   * screenshot), not a real hero: the readme-hero study counts those
   * separately (5/30 partial vs 16/30 real hero) and the gallery shows the
   * badge. Absent means the preset is not partial.
   */
  partial?: boolean;
}

/** Declared page size of a standard format, as a template `size`. */
function formatSize(format: PageFormatId): { width: number; height: number } {
  const { width, height } = getPageFormat(format);

  return { width, height };
}

/** Page of a seed: format geometry plus the design's own solid background. */
function buildPage(format: PageFormatId, name: string, background: string): DocumentPage {
  const { width, height } = getPageFormat(format);

  return createPage({ name, width, height, background: { kind: 'solid', color: background } });
}

function buildSocialPost(): FremitDocument {
  const page = buildPage('poster', 'Social post', '#0b1220');

  page.objects.push(
    createShapeObject('rect', {
      name: 'Accent bar',
      x: 96,
      y: 150,
      width: 132,
      height: 14,
      cornerRadius: 7,
      fill: '#38bdf8',
    }),
    createTextObject('Big idea', {
      name: 'Headline',
      x: 96,
      y: 196,
      width: 888,
      height: 230,
      fontSize: 104,
      fontWeight: 800,
      fill: '#f8fafc',
    }),
    createTextObject('One supporting line that explains the idea.', {
      name: 'Body',
      x: 96,
      y: 470,
      width: 760,
      height: 110,
      fontSize: 40,
      fill: '#cbd5e1',
    }),
    createShapeObject('ellipse', {
      name: 'Dot',
      x: 96,
      y: 900,
      width: 32,
      height: 32,
      fill: '#38bdf8',
    }),
  );

  return createDocument([page]);
}

function buildQuoteCard(): FremitDocument {
  const page = buildPage('poster', 'Quote card', '#faf4ea');

  page.objects.push(
    createTextObject('\u201c', {
      name: 'Quote mark',
      x: 80,
      y: 40,
      width: 300,
      height: 280,
      fontSize: 240,
      fontWeight: 400,
      fontFamily: SERIF,
      fill: '#d8c3a5',
    }),
    createTextObject('Simplicity is the soul of efficiency.', {
      name: 'Quote',
      x: 96,
      y: 380,
      width: 888,
      height: 260,
      fontSize: 76,
      fontWeight: 500,
      fontFamily: SERIF,
      fill: '#1f2937',
    }),
    createTextObject('\u2014 Austin Freeman', {
      name: 'Author',
      x: 96,
      y: 700,
      width: 888,
      height: 60,
      fontSize: 36,
      fill: '#6b7280',
    }),
    createShapeObject('rect', {
      name: 'Rule',
      x: 96,
      y: 820,
      width: 220,
      height: 10,
      cornerRadius: 5,
      fill: '#b45309',
    }),
  );

  return createDocument([page]);
}

function buildAnnouncement(): FremitDocument {
  const page = buildPage('banner', 'Announcement', '#f5f0e8');

  page.objects.push(
    createShapeObject('rect', {
      name: 'Tag',
      x: 96,
      y: 90,
      width: 220,
      height: 60,
      cornerRadius: 30,
      fill: '#1f6feb',
    }),
    createTextObject('New', {
      name: 'Tag label',
      x: 96,
      y: 104,
      width: 220,
      height: 40,
      fontSize: 28,
      fontWeight: 700,
      fill: '#ffffff',
      align: 'center',
    }),
    createTextObject('Announcement', {
      name: 'Headline',
      x: 96,
      y: 190,
      width: 900,
      height: 140,
      fontSize: 96,
      fontWeight: 800,
      fill: '#111827',
    }),
    createTextObject('One line about what changed and why it matters.', {
      name: 'Body',
      x: 96,
      y: 350,
      width: 1100,
      height: 60,
      fontSize: 36,
      fill: '#4b5563',
    }),
    createShapeObject('ellipse', {
      name: 'Dot',
      x: 1330,
      y: 170,
      width: 160,
      height: 160,
      fill: '#1f6feb',
      opacity: 0.85,
    }),
  );

  return createDocument([page]);
}

function buildEventPoster(): FremitDocument {
  const page = buildPage('poster', 'Event poster', '#111827');

  page.objects.push(
    createShapeObject('ellipse', {
      name: 'Date badge',
      x: 96,
      y: 96,
      width: 150,
      height: 150,
      fill: '#f59e0b',
    }),
    createTextObject('18', {
      name: 'Date',
      x: 96,
      y: 128,
      width: 150,
      height: 90,
      fontSize: 72,
      fontWeight: 800,
      fill: '#111827',
      align: 'center',
    }),
    createTextObject('Live session', {
      name: 'Headline',
      x: 96,
      y: 330,
      width: 888,
      height: 190,
      fontSize: 104,
      fontWeight: 800,
      fill: '#f9fafb',
    }),
    createTextObject('Talks, demos and a live Q&A.', {
      name: 'Subtitle',
      x: 96,
      y: 520,
      width: 780,
      height: 80,
      fontSize: 40,
      fill: '#9ca3af',
    }),
    createShapeObject('rect', {
      name: 'Divider',
      x: 96,
      y: 660,
      width: 888,
      height: 2,
      fill: '#374151',
    }),
    createTextObject('7:00 PM \u00b7 Main hall', {
      name: 'Meta',
      x: 96,
      y: 700,
      width: 888,
      height: 60,
      fontSize: 36,
      fill: '#d1d5db',
    }),
  );

  return createDocument([page]);
}

function buildSaleBanner(): FremitDocument {
  const page = buildPage('banner', 'Sale banner', '#7c2d12');

  page.objects.push(
    createTextObject('Summer sale', {
      name: 'Headline',
      x: 96,
      y: 120,
      width: 820,
      height: 160,
      fontSize: 96,
      fontWeight: 800,
      fill: '#fff7ed',
    }),
    createTextObject('Up to 50% off everything.', {
      name: 'Body',
      x: 96,
      y: 300,
      width: 700,
      height: 70,
      fontSize: 44,
      fill: '#fed7aa',
    }),
    createShapeObject('rect', {
      name: 'Tag',
      x: 1080,
      y: 130,
      width: 300,
      height: 240,
      cornerRadius: 28,
      fill: '#fb923c',
      rotation: -8,
    }),
    createTextObject('50%', {
      name: 'Tag label',
      x: 1080,
      y: 210,
      width: 300,
      height: 120,
      fontSize: 76,
      fontWeight: 900,
      fill: '#7c2d12',
      align: 'center',
      rotation: -8,
    }),
  );

  return createDocument([page]);
}

function buildHeroSlide(): FremitDocument {
  const page = buildPage('hero', 'Hero slide', '#0f172a');

  page.objects.push(
    createShapeObject('rect', {
      name: 'Accent bar',
      x: 140,
      y: 300,
      width: 180,
      height: 16,
      cornerRadius: 8,
      fill: '#22d3ee',
    }),
    createTextObject('Product update', {
      name: 'Headline',
      x: 140,
      y: 350,
      width: 1400,
      height: 220,
      fontSize: 128,
      fontWeight: 800,
      fill: '#f8fafc',
    }),
    createTextObject('Everything that shipped this quarter, on one slide.', {
      name: 'Body',
      x: 140,
      y: 600,
      width: 1100,
      height: 100,
      fontSize: 48,
      fill: '#94a3b8',
    }),
    createShapeObject('rect', {
      name: 'Progress track',
      x: 140,
      y: 920,
      width: 1640,
      height: 6,
      cornerRadius: 3,
      fill: '#1e293b',
    }),
    createShapeObject('rect', {
      name: 'Progress',
      x: 140,
      y: 920,
      width: 600,
      height: 6,
      cornerRadius: 3,
      fill: '#22d3ee',
    }),
  );

  return createDocument([page]);
}

function buildProductCard(): FremitDocument {
  const page = buildPage('poster', 'Product card', '#f8fafc');

  page.objects.push(
    createShapeObject('rect', {
      name: 'Photo frame',
      x: 90,
      y: 90,
      width: 900,
      height: 560,
      cornerRadius: 24,
      fill: '#e2e8f0',
    }),
    createTextObject('Product photo', {
      name: 'Photo hint',
      x: 90,
      y: 340,
      width: 900,
      height: 80,
      fontSize: 44,
      fontWeight: 600,
      fill: '#94a3b8',
      align: 'center',
    }),
    createTextObject('Product name', {
      name: 'Product name',
      x: 90,
      y: 700,
      width: 620,
      height: 90,
      fontSize: 64,
      fontWeight: 700,
      fill: '#0f172a',
    }),
    createTextObject('$ 49', {
      name: 'Price',
      x: 90,
      y: 810,
      width: 300,
      height: 80,
      fontSize: 56,
      fontWeight: 800,
      fill: '#0f766e',
    }),
    createShapeObject('rect', {
      name: 'Buy button',
      x: 700,
      y: 800,
      width: 290,
      height: 80,
      cornerRadius: 40,
      fill: '#0f172a',
    }),
    createTextObject('Buy now', {
      name: 'Buy label',
      x: 700,
      y: 818,
      width: 290,
      height: 50,
      fontSize: 32,
      fontWeight: 600,
      fill: '#ffffff',
      align: 'center',
    }),
  );

  return createDocument([page]);
}

function buildStatsCard(): FremitDocument {
  const page = buildPage('poster', 'Stats card', '#ffffff');

  page.objects.push(
    createTextObject('By the numbers', {
      name: 'Title',
      x: 96,
      y: 120,
      width: 888,
      height: 100,
      fontSize: 56,
      fontWeight: 700,
      fill: '#0f172a',
    }),
    createTextObject('42', {
      name: 'Projects value',
      x: 96,
      y: 300,
      width: 260,
      height: 160,
      fontSize: 120,
      fontWeight: 800,
      fill: '#0f766e',
    }),
    createTextObject('Projects', {
      name: 'Projects label',
      x: 96,
      y: 470,
      width: 260,
      height: 50,
      fontSize: 32,
      fill: '#64748b',
    }),
    createTextObject('8', {
      name: 'Years value',
      x: 420,
      y: 300,
      width: 260,
      height: 160,
      fontSize: 120,
      fontWeight: 800,
      fill: '#0f766e',
    }),
    createTextObject('Years', {
      name: 'Years label',
      x: 420,
      y: 470,
      width: 260,
      height: 50,
      fontSize: 32,
      fill: '#64748b',
    }),
    createTextObject('120', {
      name: 'Releases value',
      x: 744,
      y: 300,
      width: 260,
      height: 160,
      fontSize: 120,
      fontWeight: 800,
      fill: '#0f766e',
    }),
    createTextObject('Releases', {
      name: 'Releases label',
      x: 744,
      y: 470,
      width: 260,
      height: 50,
      fontSize: 32,
      fill: '#64748b',
    }),
    createShapeObject('rect', {
      name: 'Divider',
      x: 96,
      y: 620,
      width: 888,
      height: 2,
      fill: '#e2e8f0',
    }),
    createTextObject('Updated monthly', {
      name: 'Footnote',
      x: 96,
      y: 660,
      width: 888,
      height: 50,
      fontSize: 28,
      fill: '#94a3b8',
    }),
  );

  return createDocument([page]);
}

function buildStoryPromo(): FremitDocument {
  const page = buildPage('poster', 'Story promo', '#4c1d95');

  page.objects.push(
    createShapeObject('ellipse', {
      name: 'Badge',
      x: 390,
      y: 180,
      width: 300,
      height: 300,
      fill: '#8b5cf6',
    }),
    createTextObject('1.0', {
      name: 'Badge label',
      x: 390,
      y: 285,
      width: 300,
      height: 110,
      fontSize: 84,
      fontWeight: 800,
      fill: '#f5f3ff',
      align: 'center',
    }),
    createTextObject('Try it now', {
      name: 'Headline',
      x: 90,
      y: 560,
      width: 900,
      height: 140,
      fontSize: 104,
      fontWeight: 800,
      fill: '#f5f3ff',
      align: 'center',
    }),
    createTextObject('Tap the link to open the editor.', {
      name: 'Body',
      x: 90,
      y: 720,
      width: 900,
      height: 60,
      fontSize: 36,
      fill: '#ddd6fe',
      align: 'center',
    }),
  );

  return createDocument([page]);
}

function buildNewsletterHeader(): FremitDocument {
  const page = buildPage('banner', 'Newsletter header', '#fffbf5');

  page.objects.push(
    createTextObject('The Monthly Dispatch', {
      name: 'Title',
      x: 96,
      y: 110,
      width: 1000,
      height: 130,
      fontSize: 84,
      fontWeight: 800,
      fill: '#1f2937',
    }),
    createShapeObject('rect', {
      name: 'Divider',
      x: 96,
      y: 270,
      width: 1308,
      height: 4,
      cornerRadius: 2,
      fill: '#e5e7eb',
    }),
    createTextObject('Issue 12 \u00b7 October', {
      name: 'Issue',
      x: 96,
      y: 300,
      width: 800,
      height: 50,
      fontSize: 34,
      fill: '#6b7280',
    }),
    createShapeObject('rect', {
      name: 'Accent',
      x: 96,
      y: 390,
      width: 96,
      height: 12,
      cornerRadius: 6,
      fill: '#b45309',
    }),
    createShapeObject('ellipse', {
      name: 'Dot',
      x: 1330,
      y: 150,
      width: 120,
      height: 120,
      fill: '#b45309',
      opacity: 0.9,
    }),
  );

  return createDocument([page]);
}

/**
 * Banner card — the shared layout of the README hero family (P1 of the
 * readme-hero study) and the profile family (P7). Each seed is a header card
 * whose page width is the declared `<img width>` of the banner: the measured
 * small 369/430 variants for minimalist projects, the default 720/840 band,
 * the 1200 showcase and the 1600-wide fluid source for `width="100%"` (wide
 * enough that a 100% render on the ~830 px README column never upscales); the
 * profile family takes the measured 369–640 band (the 640 and 400 seeds) and
 * the same fluid source. The card keeps the position the study measured — the
 * banner at the top, right after the title — with the name and tagline first
 * and the image slot below them.
 *
 * The image slot is a self-contained SVG placeholder (a data URL, so the seed
 * opens offline): solid fill, the slot label and the declared slot size. It is
 * a normal image object of the document — replace it with the real banner and
 * the seed is the export. No new object type and no third-party code: the same
 * `document` factories every other seed uses.
 */
interface BannerCardSpec {
  /** Page name shown in the Pages panel. */
  pageName: string;
  /** Declared width of the hero, in page pixels. */
  width: number;
  /** Full-bleed variant: the image slot runs edge to edge (`width="100%"`). */
  fullBleed?: boolean;
  background: string;
  titleFill: string;
  taglineFill: string;
  accentFill: string;
  placeholderFill: string;
  placeholderInk: string;
}

/**
 * A placeholder dimension in markup: rounded to whole pixels and clamped to
 * the 1 px minimum — `NaN`, the infinities, zero and the negatives all land
 * there, so a hostile number can never emit `width="NaN"` or a non-positive
 * size. Same rule the strings follow through `escapeXml`.
 */
function placeholderSize(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
}

/**
 * Self-contained SVG placeholder of a slot, as a data URL: solid fill, the
 * slot label and the declared slot size. `play` adds the badge of a video slot
 * and `title` the accessible name (the SVG `<title>`) — the alt the study asks
 * of a demo or sponsor slot. Every string that lands in the markup goes
 * through `escapeXml` — same rule `pageToSvg` follows — so a hand-edited value
 * can never break the SVG, and the dimensions go through `placeholderSize` —
 * rounded and clamped to at least one pixel. The seed family functions feed
 * it the declared specs; the tests feed it hostile ones.
 */
export interface SlotPlaceholderOptions {
  fill: string;
  ink: string;
  label: string;
  /** Accessible name of the slot, rendered as the SVG `<title>` (its alt). */
  title?: string;
  /** Draws the play badge of a video slot. */
  play?: boolean;
}

export function slotPlaceholderSrc(
  options: SlotPlaceholderOptions,
  width: number,
  height: number,
): string {
  const { fill, ink, label, title, play = false } = options;
  const safeWidth = placeholderSize(width);
  const safeHeight = placeholderSize(height);
  const labelSize = Math.max(12, Math.round(safeHeight * 0.09));
  const sizeSize = Math.max(10, Math.round(safeHeight * 0.055));
  const centerX = safeWidth / 2;
  const titleMarkup = title === undefined ? '' : `<title>${escapeXml(title)}</title>`;
  let badge = '';
  let labelY = Math.round(safeHeight / 2 - 4);

  if (play) {
    const radius = Math.max(14, Math.round(Math.min(safeWidth, safeHeight) * 0.16));
    const centerY = Math.round(safeHeight * 0.34);
    const triangle = Math.round(radius * 0.55);
    const left = Math.round(centerX - triangle * 0.7);

    badge =
      `<circle cx="${Math.round(centerX)}" cy="${centerY}" r="${radius}" fill="${escapeXml(ink)}"/>` +
      `<path d="M ${left} ${centerY - triangle} L ${left} ${centerY + triangle} L ${Math.round(centerX + triangle)} ${centerY} Z" fill="${escapeXml(fill)}"/>`;
    labelY = centerY + radius + labelSize + 6;
  }

  const sizeY = labelY + labelSize + 4;
  const font = 'Arial, Helvetica, sans-serif';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">` +
    titleMarkup +
    `<rect width="${safeWidth}" height="${safeHeight}" fill="${escapeXml(fill)}"/>` +
    badge +
    `<text x="${centerX}" y="${labelY}" text-anchor="middle" font-family="${font}" font-size="${labelSize}" fill="${escapeXml(ink)}">${escapeXml(label)}</text>` +
    `<text x="${centerX}" y="${sizeY}" text-anchor="middle" font-family="${font}" font-size="${sizeSize}" fill="${escapeXml(ink)}">${safeWidth} \u00d7 ${safeHeight}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Placeholder of the hero image slot of a README hero card, as a data URL.
 * The gallery only feeds it the declared specs; the function is exported for
 * the injection test. `slot` overrides the label and the accessible name —
 * the animated hero family passes its own pair; absent means the static
 * 'Hero image' slot.
 */
export function heroPlaceholderSrc(
  spec: BannerCardSpec,
  width: number,
  height: number,
  slot?: { label: string; title?: string },
): string {
  return slotPlaceholderSrc(
    {
      fill: spec.placeholderFill,
      ink: spec.placeholderInk,
      label: slot?.label ?? 'Hero image',
      title: slot?.title,
    },
    width,
    height,
  );
}

/**
 * Copy of a banner card: the layer names and the placeholder texts. The hero
 * and the profile families share the layout and differ here.
 */
interface BannerCopy {
  titleLayer: string;
  titleText: string;
  taglineLayer: string;
  taglineText: string;
}

const HERO_COPY: BannerCopy = {
  titleLayer: 'Project name',
  titleText: 'Project name',
  taglineLayer: 'Tagline',
  taglineText: 'One line about the project.',
};

const PROFILE_COPY: BannerCopy = {
  titleLayer: 'Profile name',
  titleText: 'Profile name',
  taglineLayer: 'Bio',
  taglineText: 'One line about the profile.',
};

/** Measured height of the streak card of the profile stats (P7). */
const PROFILE_STREAK_HEIGHT = 165;

/** Label of the animated hero slot: names the animated file of the pair. */
const HERO_ANIM_LABEL = 'Hero anim (WebP)';

/**
 * Line naming the static fallback of an animated slot (P-webp2/P-webp4): the
 * sibling file the README serves to readers without animation and to
 * `prefers-reduced-motion`. The seed carries the declaration as a normal text
 * object — the animated artifact itself belongs to the animation slice, never
 * to the static export (ADR-007 §6).
 */
function staticFallbackLine(file: string): string {
  return `Static fallback: ${file} (prefers-reduced-motion)`;
}

/**
 * Layout of one banner card, proportional to the declared width: margins, the
 * accent bar, the title and tagline block, and the image slot. The slot is
 * half as tall as it is wide (the 2:1 banner ratio of the measured family)
 * and the page height is what the stack adds up to — the declared `size` of
 * each definition is that same geometry as a literal, and the tests compare
 * the built page against it, so a layout change cannot silently resize a
 * seed.
 *
 * `stats` appends the profile stats of the study (P7) below the hero — the
 * streak card at its measured height (165) and the star history chart — with
 * their own accessible names. They are opt-in: the gallery builds the
 * default, and the flag is the only way in.
 *
 * `anim` is the P-webp2 variant of the card: the slot is declared as the
 * animated WebP (its own label and alt) and the named static fallback line is
 * appended below it. The animation itself is not exported in this slice
 * (ADR-007 §6 — the export is static): the seed declares the pair
 * (`hero-anim.webp` + `hero.png`), so the README keeps the fallback for
 * readers without animation and for `prefers-reduced-motion`.
 */
interface BannerCardOptions {
  /** P7 profile stats below the hero (off by default). */
  stats?: boolean;
  /** P-webp2 animated hero: slot alt and the named static fallback file. */
  anim?: { alt: string; fallbackFile: string };
}

function buildBannerCard(
  spec: BannerCardSpec,
  copy: BannerCopy,
  options: BannerCardOptions = {},
): DocumentPage {
  const { stats = false, anim } = options;
  const { width } = spec;
  const margin = Math.round(width * 0.055);
  const accentHeight = Math.max(6, Math.round(width * 0.012));
  const titleSize = Math.round(width * 0.085);
  const titleHeight = Math.round(titleSize * 1.25);
  const taglineSize = Math.max(12, Math.round(width * 0.036));
  const taglineHeight = Math.round(taglineSize * 1.3);

  const accentY = margin;
  const titleY = accentY + accentHeight + Math.round(width * 0.03);
  const taglineY = titleY + titleHeight + Math.round(width * 0.015);
  const imageX = spec.fullBleed ? 0 : margin;
  const imageY = taglineY + taglineHeight + Math.round(width * 0.05);
  const imageWidth = width - imageX * 2;
  const imageHeight = Math.round(imageWidth / 2);
  const statsObjects: DocumentObject[] = [];
  const fallbackObjects: DocumentObject[] = [];
  let contentBottom = imageY + imageHeight;

  if (stats) {
    const statsWidth = width - margin * 2;
    const streakY = imageY + imageHeight + Math.round(width * 0.03);
    const historyY = streakY + PROFILE_STREAK_HEIGHT + Math.round(width * 0.02);
    const historyHeight = Math.round(statsWidth / 2);

    statsObjects.push(
      createImageObject(
        slotPlaceholderSrc(
          {
            fill: spec.placeholderFill,
            ink: spec.placeholderInk,
            label: 'Streak stats',
            title: 'GitHub streak stats',
          },
          statsWidth,
          PROFILE_STREAK_HEIGHT,
        ),
        {
          name: 'Streak stats',
          x: margin,
          y: streakY,
          width: statsWidth,
          height: PROFILE_STREAK_HEIGHT,
          fit: 'contain',
        },
      ),
      createImageObject(
        slotPlaceholderSrc(
          {
            fill: spec.placeholderFill,
            ink: spec.placeholderInk,
            label: 'Star history',
            title: 'Star history chart',
          },
          statsWidth,
          historyHeight,
        ),
        {
          name: 'Star history',
          x: margin,
          y: historyY,
          width: statsWidth,
          height: historyHeight,
          fit: 'contain',
        },
      ),
    );
    contentBottom = historyY + historyHeight;
  }

  if (anim) {
    const fallbackSize = Math.max(12, Math.round(width * 0.022));
    const fallbackHeight = Math.round(fallbackSize * 1.3);
    const fallbackY = contentBottom + Math.round(width * 0.025);

    fallbackObjects.push(
      createTextObject(staticFallbackLine(anim.fallbackFile), {
        name: 'Static fallback',
        x: margin,
        y: fallbackY,
        width: width - margin * 2,
        height: fallbackHeight,
        fontSize: fallbackSize,
        fill: spec.taglineFill,
      }),
    );
    contentBottom = fallbackY + fallbackHeight;
  }

  const pageHeight = contentBottom + margin;
  const page = createPage({
    name: spec.pageName,
    width,
    height: pageHeight,
    background: { kind: 'solid', color: spec.background },
  });

  page.objects.push(
    createShapeObject('rect', {
      name: 'Accent bar',
      x: margin,
      y: accentY,
      width: Math.round(width * 0.18),
      height: accentHeight,
      cornerRadius: accentHeight / 2,
      fill: spec.accentFill,
    }),
    createTextObject(copy.titleText, {
      name: copy.titleLayer,
      x: margin,
      y: titleY,
      width: width - margin * 2,
      height: titleHeight,
      fontSize: titleSize,
      fontWeight: 800,
      fill: spec.titleFill,
    }),
    createTextObject(copy.taglineText, {
      name: copy.taglineLayer,
      x: margin,
      y: taglineY,
      width: width - margin * 2,
      height: taglineHeight,
      fontSize: taglineSize,
      fill: spec.taglineFill,
    }),
    createImageObject(
      heroPlaceholderSrc(
        spec,
        imageWidth,
        imageHeight,
        anim ? { label: HERO_ANIM_LABEL, title: anim.alt } : undefined,
      ),
      {
        name: anim ? 'Hero anim' : 'Hero image',
        x: imageX,
        y: imageY,
        width: imageWidth,
        height: imageHeight,
        fit: 'cover',
      },
    ),
    ...statsObjects,
    ...fallbackObjects,
  );

  return page;
}

/** README hero seed (P1): the banner card with the project copy, no stats. */
function buildReadmeHero(spec: BannerCardSpec): FremitDocument {
  return createDocument([buildBannerCard(spec, HERO_COPY)]);
}

const README_HERO_SPECS: Record<ReadmeHeroTemplateId, BannerCardSpec> = {
  'readme-hero-369': {
    pageName: 'README hero 369',
    width: 369,
    background: '#ffffff',
    titleFill: '#0f172a',
    taglineFill: '#475569',
    accentFill: '#4f46e5',
    placeholderFill: '#eef2f7',
    placeholderInk: '#64748b',
  },
  'readme-hero-430': {
    pageName: 'README hero 430',
    width: 430,
    background: '#faf4ea',
    titleFill: '#1f2937',
    taglineFill: '#57534e',
    accentFill: '#b45309',
    placeholderFill: '#efe6d8',
    placeholderInk: '#78716c',
  },
  'readme-hero-720': {
    pageName: 'README hero 720',
    width: 720,
    background: '#0f172a',
    titleFill: '#f8fafc',
    taglineFill: '#94a3b8',
    accentFill: '#22d3ee',
    placeholderFill: '#1e293b',
    placeholderInk: '#94a3b8',
  },
  'readme-hero-840': {
    pageName: 'README hero 840',
    width: 840,
    background: '#0b1220',
    titleFill: '#f8fafc',
    taglineFill: '#94a3b8',
    accentFill: '#38bdf8',
    placeholderFill: '#172033',
    placeholderInk: '#7c8db0',
  },
  'readme-hero-1200': {
    pageName: 'README hero 1200',
    width: 1200,
    background: '#111827',
    titleFill: '#f9fafb',
    taglineFill: '#9ca3af',
    accentFill: '#8b5cf6',
    placeholderFill: '#1f2937',
    placeholderInk: '#9ca3af',
  },
  'readme-hero-fluid-100': {
    pageName: 'README hero 100%',
    width: 1600,
    fullBleed: true,
    background: '#022c22',
    titleFill: '#ecfdf5',
    taglineFill: '#6ee7b7',
    accentFill: '#34d399',
    placeholderFill: '#064e3b',
    placeholderInk: '#34d399',
  },
};

/** Alt of the animated hero slot (P-webp4): the alt says it is animated. */
const HERO_ANIM_ALT = 'Animated hero: light and dark theme switch.';
/** Named static fallback of the animated hero (P-webp2 pair). */
const HERO_ANIM_FALLBACK = 'hero.png';

/**
 * Animated hero family — the P-webp2 preset of the webp study, as three
 * seeds: the measured hero-anim band is 760–800 px or a fluid 100% (auteur's
 * 760, the band of the study, and the 100% showcase), in the same slot and
 * position as the static hero family (top after the title, centered). The
 * slot is declared as the animated WebP with its named static fallback below
 * it — never as an export of the editor (ADR-007 §6: the export is static);
 * the animated artifact itself belongs to the animation slice.
 */
const README_HERO_ANIM_SPECS: Record<ReadmeHeroAnimTemplateId, BannerCardSpec> = {
  'readme-hero-anim-760': {
    pageName: 'README hero anim 760',
    width: 760,
    background: '#18181b',
    titleFill: '#fafafa',
    taglineFill: '#a1a1aa',
    accentFill: '#f472b6',
    placeholderFill: '#27272a',
    placeholderInk: '#f9a8d4',
  },
  'readme-hero-anim-800': {
    pageName: 'README hero anim 800',
    width: 800,
    background: '#082f49',
    titleFill: '#f0f9ff',
    taglineFill: '#7dd3fc',
    accentFill: '#0ea5e9',
    placeholderFill: '#0c4a6e',
    placeholderInk: '#bae6fd',
  },
  'readme-hero-anim-fluid-100': {
    pageName: 'README hero anim 100%',
    width: 1600,
    fullBleed: true,
    background: '#1c1917',
    titleFill: '#fafaf9',
    taglineFill: '#a8a29e',
    accentFill: '#fb923c',
    placeholderFill: '#292524',
    placeholderInk: '#fdba74',
  },
};

/** README animated hero seed (P-webp2): the banner card with the anim pair. */
function buildReadmeHeroAnim(spec: BannerCardSpec): FremitDocument {
  return createDocument([
    buildBannerCard(spec, HERO_COPY, {
      anim: { alt: HERO_ANIM_ALT, fallbackFile: HERO_ANIM_FALLBACK },
    }),
  ]);
}

/**
 * Profile hero family — the P7 preset of the readme-hero study, as three
 * static seeds: the measured band is 369–640 px or a fluid 100%, and the
 * seeds take the top of the band (paperclip's 640), its middle (affaan-m's
 * 400) and the same 1600-wide fluid source the hero family uses. Same card,
 * profile copy; the stats are the explicit flag of `buildProfileHeroDocument`.
 */
const PROFILE_HERO_SPECS: Record<ProfileHeroTemplateId, BannerCardSpec> = {
  'profile-hero-640': {
    pageName: 'Profile hero 640',
    width: 640,
    background: '#ffffff',
    titleFill: '#0f172a',
    taglineFill: '#475569',
    accentFill: '#4f46e5',
    placeholderFill: '#eef2f7',
    placeholderInk: '#64748b',
  },
  'profile-hero-400': {
    pageName: 'Profile hero 400',
    width: 400,
    background: '#0f172a',
    titleFill: '#f8fafc',
    taglineFill: '#94a3b8',
    accentFill: '#22d3ee',
    placeholderFill: '#1e293b',
    placeholderInk: '#94a3b8',
  },
  'profile-hero-fluid-100': {
    pageName: 'Profile hero 100%',
    width: 1600,
    fullBleed: true,
    background: '#111827',
    titleFill: '#f9fafb',
    taglineFill: '#9ca3af',
    accentFill: '#8b5cf6',
    placeholderFill: '#1f2937',
    placeholderInk: '#9ca3af',
  },
};

/**
 * Profile hero seed (P7): the profile README banner — the same card as the
 * hero family with the profile copy. `stats` is the explicit opt-in of the
 * study's profile stats (streak card at its measured height and star
 * history): measured in 1/3 of the profiles, rare, so the default is off and
 * the gallery builds the default.
 */
export function buildProfileHeroDocument(
  templateId: ProfileHeroTemplateId,
  options: { stats?: boolean } = {},
): FremitDocument {
  return createDocument([
    buildBannerCard(PROFILE_HERO_SPECS[templateId], PROFILE_COPY, {
      stats: options.stats ?? false,
    }),
  ]);
}

/**
 * Alt of the demo slot (P4): descriptive — what the demo shows, never a file
 * name. It travels twice: as the `<title>` of the placeholder (the accessible
 * name of the image) and as the visible caption below the slot.
 */
const DEMO_ALT = 'Demo: quick switch between light and dark.';

/** Declared geometry of the README demo seed: the measured 600w column. */
const DEMO_PAGE_WIDTH = 600;
const DEMO_MARGIN = 30;
const DEMO_HERO_HEIGHT = 300;
const DEMO_HEADING_HEIGHT = 46;
const DEMO_SLOT_HEIGHT = 338;
const DEMO_CAPTION_HEIGHT = 24;

/**
 * Shared header of the README demo family (P4/P-webp3): the static hero band
 * and the Demo heading, stacked exactly as both seeds declare them, plus the
 * slot y the rest of the column hangs from. The static and the animated demo
 * used to repeat this block verbatim — the extraction is what keeps the two
 * families from drifting apart.
 */
function demoHeader(width: number): { objects: DocumentObject[]; slotY: number } {
  const headingY = DEMO_HERO_HEIGHT + DEMO_MARGIN;
  const objects: DocumentObject[] = [
    createImageObject(
      slotPlaceholderSrc(
        { fill: '#eef2f7', ink: '#64748b', label: 'Hero image' },
        width,
        DEMO_HERO_HEIGHT,
      ),
      { name: 'Hero image', x: 0, y: 0, width, height: DEMO_HERO_HEIGHT, fit: 'cover' },
    ),
    createTextObject('Demo', {
      name: 'Demo heading',
      x: DEMO_MARGIN,
      y: headingY,
      width: width - DEMO_MARGIN * 2,
      height: DEMO_HEADING_HEIGHT,
      fontSize: 36,
      fontWeight: 800,
      fill: '#0f172a',
    }),
  ];

  return { objects, slotY: headingY + DEMO_HEADING_HEIGHT + 18 };
}

/**
 * Caption band of the README demo family: the shared text style the
 * descriptive alt rides in below the slot. Only the text and the y differ
 * between the static and the animated seed (their slots are different
 * heights), so the band itself is one function.
 */
function demoCaption(text: string, width: number, y: number) {
  return createTextObject(text, {
    name: 'Demo caption',
    x: DEMO_MARGIN,
    y,
    width: width - DEMO_MARGIN * 2,
    height: DEMO_CAPTION_HEIGHT,
    fontSize: 18,
    fill: '#64748b',
  });
}

/**
 * README demo seed (P4 of the readme-hero study): the demo slot after the
 * hero. The page is the 600 px README column of the measured preset — the
 * shared hero band and Demo heading, the 600w slot (a video placeholder with
 * the play badge, the size of the measured demo; swap it for the project GIF
 * or video) and the caption that carries the descriptive alt. The position is
 * part of the seed: the slot sits below the hero, never before it.
 */
function buildReadmeDemo(): FremitDocument {
  const width = DEMO_PAGE_WIDTH;
  const header = demoHeader(width);
  const captionY = header.slotY + DEMO_SLOT_HEIGHT + 14;
  const page = createPage({
    name: 'README demo 600',
    width,
    height: captionY + DEMO_CAPTION_HEIGHT + DEMO_MARGIN,
    background: { kind: 'solid', color: '#ffffff' },
  });

  page.objects.push(
    ...header.objects,
    createImageObject(
      slotPlaceholderSrc(
        { fill: '#1e293b', ink: '#94a3b8', label: 'Demo video', title: DEMO_ALT, play: true },
        width,
        DEMO_SLOT_HEIGHT,
      ),
      { name: 'Demo video', x: 0, y: header.slotY, width, height: DEMO_SLOT_HEIGHT, fit: 'cover' },
    ),
    demoCaption(DEMO_ALT, width, captionY),
  );

  return createDocument([page]);
}

/**
 * Alt of the animated demo slot (P-webp3/P-webp4): descriptive — what the
 * demo shows — and it says it is animated. It travels twice, like the static
 * demo's: as the `<title>` of the placeholder and as the visible caption.
 */
const DEMO_ANIM_ALT = 'Animated demo: quick switch between light and dark.';
/** Named static fallback of the animated demo (P-webp2 pair). */
const DEMO_ANIM_FALLBACK = 'demo.png';

/**
 * Animated demo family — the P-webp3 preset of the webp study, as the two
 * measured percentages of the README column: newtube's 23% (a small animated
 * demo after a static hero) and OpenWBT's 80% (the denser demonstration
 * section). Same 600 px column and same position rule as the static demo —
 * after the hero, never before — with the hero band static and the demo slot
 * declared as the animated WebP at its percentage width, followed by the
 * descriptive alt and the named static fallback line. The percentage is the
 * seed: the slot width is that fraction of the column, centered.
 */
const DEMO_ANIM_SPECS: Record<ReadmeDemoAnimTemplateId, { pageName: string; percent: number }> = {
  'readme-demo-anim-23': { pageName: 'README demo anim 23%', percent: 0.23 },
  'readme-demo-anim-80': { pageName: 'README demo anim 80%', percent: 0.8 },
};

function buildReadmeDemoAnim(templateId: ReadmeDemoAnimTemplateId): FremitDocument {
  const width = DEMO_PAGE_WIDTH;
  const spec = DEMO_ANIM_SPECS[templateId];
  const slotWidth = Math.round(width * spec.percent);
  const slotHeight = Math.round((slotWidth * 9) / 16);
  const slotX = Math.round((width - slotWidth) / 2);
  const header = demoHeader(width);
  const captionY = header.slotY + slotHeight + 14;
  const fallbackY = captionY + DEMO_CAPTION_HEIGHT + 10;
  const page = createPage({
    name: spec.pageName,
    width,
    height: fallbackY + DEMO_CAPTION_HEIGHT + DEMO_MARGIN,
    background: { kind: 'solid', color: '#ffffff' },
  });

  page.objects.push(
    ...header.objects,
    createImageObject(
      slotPlaceholderSrc(
        {
          fill: '#1e293b',
          ink: '#94a3b8',
          label: 'Demo anim (WebP)',
          title: DEMO_ANIM_ALT,
        },
        slotWidth,
        slotHeight,
      ),
      {
        name: 'Demo anim',
        x: slotX,
        y: header.slotY,
        width: slotWidth,
        height: slotHeight,
        fit: 'cover',
      },
    ),
    demoCaption(DEMO_ANIM_ALT, width, captionY),
    createTextObject(staticFallbackLine(DEMO_ANIM_FALLBACK), {
      name: 'Static fallback',
      x: DEMO_MARGIN,
      y: fallbackY,
      width: width - DEMO_MARGIN * 2,
      height: DEMO_CAPTION_HEIGHT,
      fontSize: 18,
      fill: '#64748b',
    }),
  );

  return createDocument([page]);
}

/** One sponsor row of the sponsors seed: name, link and the logo palette. */
interface SponsorRow {
  name: string;
  link: string;
  logoFill: string;
  logoInk: string;
}

const SPONSOR_ROWS: readonly SponsorRow[] = [
  { name: 'Aurora', link: 'aurora.example', logoFill: '#e0e7ff', logoInk: '#4338ca' },
  { name: 'Basalt', link: 'basalt.example', logoFill: '#dcfce7', logoInk: '#15803d' },
  { name: 'Cobalt', link: 'cobalt.example', logoFill: '#fef3c7', logoInk: '#b45309' },
];

const SPONSOR_BANNER = { name: 'Nimbus', link: 'nimbus.example' } as const;

/** Declared geometry of the sponsors seed: 32w logos, 440w banner. */
const SPONSORS_PAGE_WIDTH = 600;
const SPONSOR_LOGO_SIZE = 32;
const SPONSOR_BANNER_WIDTH = 440;
const SPONSOR_BANNER_HEIGHT = 110;

/**
 * Self-contained SVG placeholder of a sponsor logo, as a data URL: the
 * monogram tile of the sponsor plus its `<title>` — the alt the study asks
 * every logo to carry. Strings go through `escapeXml` like every other
 * placeholder, the name is trimmed before the monogram and the title (a blank
 * name falls back to the bare `logo`, never a leading space), and the
 * dimensions go through `placeholderSize` like the slot primitive's. Exported
 * for the injection test.
 */
export function sponsorLogoSrc(
  name: string,
  palette: { fill: string; ink: string },
  width: number,
  height: number,
): string {
  const clean = name.trim();
  const monogram = clean.charAt(0).toUpperCase() || '?';
  const title = clean === '' ? 'logo' : `${clean} logo`;
  const safeWidth = placeholderSize(width);
  const safeHeight = placeholderSize(height);
  const font = 'Arial, Helvetica, sans-serif';
  const radius = Math.max(2, Math.round(Math.min(safeWidth, safeHeight) * 0.18));
  const fontSize = Math.round(Math.min(safeWidth, safeHeight) * 0.55);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">` +
    `<title>${escapeXml(title)}</title>` +
    `<rect width="${safeWidth}" height="${safeHeight}" rx="${radius}" fill="${escapeXml(palette.fill)}"/>` +
    `<text x="${safeWidth / 2}" y="${safeHeight / 2}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-size="${fontSize}" font-weight="700" fill="${escapeXml(palette.ink)}">${escapeXml(monogram)}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Sponsors seed (P5 of the readme-hero study): the own section after the demo,
 * in the same 600 px README column. The measured treatments live side by side:
 * the 32w logo table (three rows, each a monogram tile, the name and the link)
 * and the 440w banner with its own link below. The Documento JSON has no
 * link/alt fields yet, so the seed carries both as content — the link is the
 * visible URL of the row, the alt is the `<title>` of the logo/banner
 * placeholder (the accessible name of the image).
 */
function buildSponsorsTable(): FremitDocument {
  const width = SPONSORS_PAGE_WIDTH;
  const margin = 30;
  const headingHeight = 46;
  const rowPitch = 48;
  const rowsY = margin + headingHeight + 24;
  const rowsBottom = rowsY + (SPONSOR_ROWS.length - 1) * rowPitch + SPONSOR_LOGO_SIZE;
  const bannerX = Math.round((width - SPONSOR_BANNER_WIDTH) / 2);
  const bannerY = rowsBottom + 36;
  const bannerLinkY = bannerY + SPONSOR_BANNER_HEIGHT + 10;
  const linkWidth = 240;
  const page = createPage({
    name: 'Sponsors table',
    width,
    height: bannerLinkY + 24 + margin,
    background: { kind: 'solid', color: '#ffffff' },
  });

  page.objects.push(
    createTextObject('Sponsors', {
      name: 'Sponsors heading',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: headingHeight,
      fontSize: 36,
      fontWeight: 800,
      fill: '#0f172a',
    }),
  );

  SPONSOR_ROWS.forEach((row, index) => {
    const rowY = rowsY + index * rowPitch;

    page.objects.push(
      createImageObject(
        sponsorLogoSrc(
          row.name,
          { fill: row.logoFill, ink: row.logoInk },
          SPONSOR_LOGO_SIZE,
          SPONSOR_LOGO_SIZE,
        ),
        {
          name: 'Sponsor logo',
          x: margin,
          y: rowY,
          width: SPONSOR_LOGO_SIZE,
          height: SPONSOR_LOGO_SIZE,
          fit: 'contain',
        },
      ),
      createTextObject(row.name, {
        name: 'Sponsor name',
        x: margin + SPONSOR_LOGO_SIZE + 12,
        y: rowY + 3,
        width: 200,
        height: 26,
        fontSize: 20,
        fontWeight: 600,
        fill: '#111827',
      }),
      createTextObject(row.link, {
        name: 'Sponsor link',
        x: width - margin - linkWidth,
        y: rowY + 4,
        width: linkWidth,
        height: 24,
        fontSize: 18,
        fill: '#2563eb',
        align: 'right',
      }),
    );
  });

  page.objects.push(
    createImageObject(
      slotPlaceholderSrc(
        {
          fill: '#f1f5f9',
          ink: '#64748b',
          label: 'Sponsor banner',
          title: `${SPONSOR_BANNER.name} banner`,
        },
        SPONSOR_BANNER_WIDTH,
        SPONSOR_BANNER_HEIGHT,
      ),
      {
        name: 'Sponsor banner',
        x: bannerX,
        y: bannerY,
        width: SPONSOR_BANNER_WIDTH,
        height: SPONSOR_BANNER_HEIGHT,
        fit: 'contain',
      },
    ),
    createTextObject(SPONSOR_BANNER.link, {
      name: 'Banner link',
      x: bannerX,
      y: bannerLinkY,
      width: SPONSOR_BANNER_WIDTH,
      height: 24,
      fontSize: 18,
      fill: '#2563eb',
      align: 'center',
    }),
  );

  return createDocument([page]);
}

/** Version of the release seed; every attachment name carries it. */
const RELEASE_VERSION = 'v1.4.0';

/** One row of the release attachment grid: name, digest and size. */
interface ReleaseAttachment {
  name: string;
  /** SHA-256 of the asset, as a release page publishes it. */
  sha256: string;
  size: string;
}

/**
 * Attachments of the release seed: the measured latest-release shape — a zip,
 * a binary and a PDF, each named with the version. `FRM-N4` is the rule
 * behind the naming: an asset name without the version never resolves for a
 * tag, so a row without it would be inert.
 */
const RELEASE_ATTACHMENTS: readonly ReleaseAttachment[] = [
  {
    name: `project-${RELEASE_VERSION}.zip`,
    sha256: '9f2c8e1a4b6d0f3a5c7e9b1d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a',
    size: '1.2 MB',
  },
  {
    name: `project-${RELEASE_VERSION}-setup.exe`,
    sha256: '1a3b5c7d9e0f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c0d2e4f6a8b0c1d3e5f7a9b',
    size: '18 MB',
  },
  {
    name: `project-${RELEASE_VERSION}-manual.pdf`,
    sha256: 'f0e1d2c3b4a5968778695a4b3c2d1e0f1a2b3c4d5e6f708192a3b4c5d6e7f809',
    size: '96 kB',
  },
];

/** Changelog of the release seed, as the bullets a latest release carries. */
const RELEASE_CHANGELOG = [
  '\u2022 Faster canvas rendering on large pages.',
  '\u2022 Attachment grid in the release notes.',
  '\u2022 Fixed zoom shortcuts on Windows.',
].join('\n');

/** Declared geometry of the release seed: the 600 px README column. */
const RELEASE_PAGE_WIDTH = 600;
const RELEASE_MARGIN = 30;
const RELEASE_TITLE_HEIGHT = 50;
const RELEASE_CHANGELOG_HEIGHT = 60;
const RELEASE_HEADING_HEIGHT = 34;
const RELEASE_ROW_PITCH = 64;
const RELEASE_DIVIDER_OFFSET = 48;

/**
 * Release seed (P6 of the readme-hero study): the latest release, text-only.
 * Every measured latest release (17/17 with releases) is a changelog plus the
 * attachment grid — name, SHA-256 and size, zips/bins/PDFs named with the
 * version — and **zero images**: screenshot/GIF only ever appeared in
 * historical notes (VoiceStudio, ECC), never in a latest. The seed keeps that
 * rule structurally: there is no image object to swap, and the test refuses
 * one. Every attachment name carries the version (an asset name without it
 * never resolves for a tag — `FRM-N4`).
 */
function buildReleaseGrade(): FremitDocument {
  const width = RELEASE_PAGE_WIDTH;
  const contentWidth = width - RELEASE_MARGIN * 2;
  const changelogY = RELEASE_MARGIN + RELEASE_TITLE_HEIGHT + 14;
  const headingY = changelogY + RELEASE_CHANGELOG_HEIGHT + 26;
  const rowsY = headingY + RELEASE_HEADING_HEIGHT + 22;
  const lastRowY = rowsY + (RELEASE_ATTACHMENTS.length - 1) * RELEASE_ROW_PITCH;
  const page = createPage({
    name: 'Release notes',
    width,
    height: lastRowY + RELEASE_DIVIDER_OFFSET + 1 + RELEASE_MARGIN,
    background: { kind: 'solid', color: '#ffffff' },
  });

  page.objects.push(
    createTextObject(`Release ${RELEASE_VERSION}`, {
      name: 'Release title',
      x: RELEASE_MARGIN,
      y: RELEASE_MARGIN,
      width: contentWidth,
      height: RELEASE_TITLE_HEIGHT,
      fontSize: 38,
      fontWeight: 800,
      fill: '#0f172a',
    }),
    createTextObject(RELEASE_CHANGELOG, {
      name: 'Changelog',
      x: RELEASE_MARGIN,
      y: changelogY,
      width: contentWidth,
      height: RELEASE_CHANGELOG_HEIGHT,
      fontSize: 16,
      fill: '#475569',
    }),
    createTextObject('Attachments', {
      name: 'Attachments heading',
      x: RELEASE_MARGIN,
      y: headingY,
      width: contentWidth,
      height: RELEASE_HEADING_HEIGHT,
      fontSize: 26,
      fontWeight: 700,
      fill: '#0f172a',
    }),
  );

  RELEASE_ATTACHMENTS.forEach((attachment, index) => {
    const rowY = rowsY + index * RELEASE_ROW_PITCH;

    page.objects.push(
      createTextObject(attachment.name, {
        name: 'Attachment name',
        x: RELEASE_MARGIN,
        y: rowY,
        width: contentWidth - 120,
        height: 22,
        fontSize: 16,
        fontWeight: 600,
        fill: '#111827',
      }),
      createTextObject(attachment.size, {
        name: 'Attachment size',
        x: width - RELEASE_MARGIN - 100,
        y: rowY + 2,
        width: 100,
        height: 20,
        fontSize: 14,
        fill: '#64748b',
        align: 'right',
      }),
      createTextObject(attachment.sha256, {
        name: 'Attachment SHA',
        x: RELEASE_MARGIN,
        y: rowY + 24,
        width: contentWidth,
        height: 16,
        fontSize: 10,
        fill: '#94a3b8',
      }),
      createShapeObject('rect', {
        name: 'Row divider',
        x: RELEASE_MARGIN,
        y: rowY + RELEASE_DIVIDER_OFFSET,
        width: contentWidth,
        height: 1,
        fill: '#e2e8f0',
      }),
    );
  });

  return createDocument([page]);
}

/** Declared geometry of the illustrated section title (P8). */
const TITLE_PAGE_WIDTH = 600;
const TITLE_MARGIN = 30;
/** Logo width: inside the measured 260–430 band (agent-substrate 260 … NVIDIA 430). */
const TITLE_LOGO_WIDTH = 300;
const TITLE_LOGO_HEIGHT = 150;
const TITLE_HEADING_HEIGHT = 58;
/** Screenshot slot: the intrinsic 16:10 ratio of a product screenshot. */
const TITLE_SCREENSHOT_HEIGHT = 338;

/**
 * Illustrated section title (P8 of the readme-hero study): a section anchor
 * without a full banner — a small logo (the measured 260–430 band), the
 * section heading and the screenshot at its intrinsic ratio, shown whole
 * (`contain`, never cropped to a declared band). The study marks this shape
 * `parcial` (5/30 of the READMEs): it reads as an illustrated title, never as
 * a real hero, and the definition carries the marker the gallery badge shows.
 */
function buildSectionTitle(): FremitDocument {
  const width = TITLE_PAGE_WIDTH;
  const contentWidth = width - TITLE_MARGIN * 2;
  const headingY = TITLE_MARGIN + TITLE_LOGO_HEIGHT + 24;
  const screenshotY = headingY + TITLE_HEADING_HEIGHT + 24;
  const page = createPage({
    name: 'Section title',
    width,
    height: screenshotY + TITLE_SCREENSHOT_HEIGHT + TITLE_MARGIN,
    background: { kind: 'solid', color: '#ffffff' },
  });
  const logoX = Math.round((width - TITLE_LOGO_WIDTH) / 2);

  page.objects.push(
    createImageObject(
      slotPlaceholderSrc(
        {
          fill: '#eef2f7',
          ink: '#64748b',
          label: 'Logo',
          title: 'Section logo',
        },
        TITLE_LOGO_WIDTH,
        TITLE_LOGO_HEIGHT,
      ),
      {
        name: 'Section logo',
        x: logoX,
        y: TITLE_MARGIN,
        width: TITLE_LOGO_WIDTH,
        height: TITLE_LOGO_HEIGHT,
        fit: 'contain',
      },
    ),
    createTextObject('Section title', {
      name: 'Section title',
      x: TITLE_MARGIN,
      y: headingY,
      width: contentWidth,
      height: TITLE_HEADING_HEIGHT,
      fontSize: 44,
      fontWeight: 800,
      fill: '#0f172a',
      align: 'center',
    }),
    createImageObject(
      slotPlaceholderSrc(
        {
          fill: '#1e293b',
          ink: '#94a3b8',
          label: 'Screenshot',
          title: 'Product screenshot',
        },
        contentWidth,
        TITLE_SCREENSHOT_HEIGHT,
      ),
      {
        name: 'Screenshot',
        x: TITLE_MARGIN,
        y: screenshotY,
        width: contentWidth,
        height: TITLE_SCREENSHOT_HEIGHT,
        fit: 'contain',
      },
    ),
  );

  return createDocument([page]);
}

const GITHUB_NAME_PLACEHOLDER = 'owner/repo';
const GITHUB_DESCRIPTION_PLACEHOLDER = 'Short description of the project.';
const GITHUB_LANGUAGE_PLACEHOLDER = 'Language';
const GITHUB_STARS_PLACEHOLDER = 128;
const GITHUB_FORKS_PLACEHOLDER = 12;

/**
 * GitHub project template: a poster with the repo card slots. `summary` comes
 * from `fetchRepoSummary` at runtime; `null` (offline, rate limit, invalid
 * input) keeps the placeholders and the seed still opens.
 */
export function buildGithubProjectDocument(summary: RepoSummary | null = null): FremitDocument {
  const page = buildPage('poster', 'GitHub project', '#0d1117');
  const name = summary?.fullName || GITHUB_NAME_PLACEHOLDER;
  const description = summary?.description.trim() || GITHUB_DESCRIPTION_PLACEHOLDER;
  const language = summary?.language || GITHUB_LANGUAGE_PLACEHOLDER;
  const color = summary?.languageColor || DEFAULT_LANGUAGE_COLOR;
  const stars = summary?.stars ?? GITHUB_STARS_PLACEHOLDER;
  const forks = summary?.forks ?? GITHUB_FORKS_PLACEHOLDER;

  page.objects.push(
    createShapeObject('rect', {
      name: 'Card',
      x: 80,
      y: 80,
      width: 920,
      height: 920,
      cornerRadius: 36,
      fill: '#161b22',
      stroke: '#30363d',
      strokeWidth: 2,
    }),
    createTextObject(name, {
      name: 'Repository name',
      x: 140,
      y: 150,
      width: 800,
      height: 90,
      fontSize: 64,
      fontWeight: 700,
      fill: '#e6edf3',
    }),
    createTextObject(description, {
      name: 'Repository description',
      x: 140,
      y: 270,
      width: 800,
      height: 170,
      fontSize: 34,
      fill: '#8b949e',
    }),
    createShapeObject('ellipse', {
      name: 'Language dot',
      x: 140,
      y: 470,
      width: 26,
      height: 26,
      fill: color,
    }),
    createTextObject(language, {
      name: 'Language',
      x: 182,
      y: 462,
      width: 400,
      height: 50,
      fontSize: 30,
      fill: '#8b949e',
    }),
    createTextObject(`\u2605 ${stars} \u00b7 ${forks} forks`, {
      name: 'Repository stats',
      x: 140,
      y: 540,
      width: 800,
      height: 50,
      fontSize: 30,
      fill: '#8b949e',
    }),
    createShapeObject('rect', {
      name: 'Accent bar',
      x: 140,
      y: 880,
      width: 800,
      height: 12,
      cornerRadius: 6,
      fill: '#1f6feb',
    }),
  );

  return createDocument([page]);
}

/**
 * The gallery, in reading order: ten own starters first, the README hero
 * family next (its declared page sizes live on each definition) with the
 * animated hero family right after it, the README demo with its animated
 * family, the sponsors section and the release notes after it — the measured
 * order of a README — then the profile family (its own README kind) and the
 * illustrated section title, and the GitHub project last (its card carries
 * the repo fill controls in the panel). Each seed declares the section it
 * belongs to; `TEMPLATE_SECTIONS` is the same list grouped by family.
 */
export const TEMPLATES: readonly TemplateDefinition[] = [
  { id: 'social-post', section: 'own', size: formatSize('poster'), build: buildSocialPost },
  { id: 'quote-card', section: 'own', size: formatSize('poster'), build: buildQuoteCard },
  { id: 'announcement', section: 'own', size: formatSize('banner'), build: buildAnnouncement },
  { id: 'event-poster', section: 'own', size: formatSize('poster'), build: buildEventPoster },
  { id: 'sale-banner', section: 'own', size: formatSize('banner'), build: buildSaleBanner },
  { id: 'hero-slide', section: 'own', size: formatSize('hero'), build: buildHeroSlide },
  { id: 'product-card', section: 'own', size: formatSize('poster'), build: buildProductCard },
  { id: 'stats-card', section: 'own', size: formatSize('poster'), build: buildStatsCard },
  { id: 'story-promo', section: 'own', size: formatSize('poster'), build: buildStoryPromo },
  {
    id: 'newsletter-header',
    section: 'own',
    size: formatSize('banner'),
    build: buildNewsletterHeader,
  },
  {
    id: 'readme-hero-369',
    section: 'readme-hero',
    size: { width: 369, height: 302 },
    build: () => buildReadmeHero(README_HERO_SPECS['readme-hero-369']),
  },
  {
    id: 'readme-hero-430',
    section: 'readme-hero',
    size: { width: 430, height: 352 },
    build: () => buildReadmeHero(README_HERO_SPECS['readme-hero-430']),
  },
  {
    id: 'readme-hero-720',
    section: 'readme-hero',
    size: { width: 720, height: 588 },
    build: () => buildReadmeHero(README_HERO_SPECS['readme-hero-720']),
  },
  {
    id: 'readme-hero-840',
    section: 'readme-hero',
    size: { width: 840, height: 684 },
    build: () => buildReadmeHero(README_HERO_SPECS['readme-hero-840']),
  },
  {
    id: 'readme-hero-1200',
    section: 'readme-hero',
    size: { width: 1200, height: 978 },
    build: () => buildReadmeHero(README_HERO_SPECS['readme-hero-1200']),
  },
  {
    id: 'readme-hero-fluid-100',
    section: 'readme-hero',
    size: { width: 1600, height: 1392 },
    build: () => buildReadmeHero(README_HERO_SPECS['readme-hero-fluid-100']),
  },
  {
    id: 'readme-hero-anim-760',
    section: 'animated',
    size: { width: 760, height: 660 },
    build: () => buildReadmeHeroAnim(README_HERO_ANIM_SPECS['readme-hero-anim-760']),
  },
  {
    id: 'readme-hero-anim-800',
    section: 'animated',
    size: { width: 800, height: 696 },
    build: () => buildReadmeHeroAnim(README_HERO_ANIM_SPECS['readme-hero-anim-800']),
  },
  {
    id: 'readme-hero-anim-fluid-100',
    section: 'animated',
    size: { width: 1600, height: 1478 },
    build: () => buildReadmeHeroAnim(README_HERO_ANIM_SPECS['readme-hero-anim-fluid-100']),
  },
  {
    id: 'readme-demo-600',
    section: 'readme-demo',
    size: { width: 600, height: 800 },
    build: buildReadmeDemo,
  },
  {
    id: 'readme-demo-anim-23',
    section: 'animated',
    size: { width: 600, height: 574 },
    build: () => buildReadmeDemoAnim('readme-demo-anim-23'),
  },
  {
    id: 'readme-demo-anim-80',
    section: 'animated',
    size: { width: 600, height: 766 },
    build: () => buildReadmeDemoAnim('readme-demo-anim-80'),
  },
  {
    id: 'sponsors-table',
    section: 'sponsors',
    size: { width: 600, height: 438 },
    build: buildSponsorsTable,
  },
  {
    id: 'release-grade',
    section: 'release',
    size: { width: 600, height: 443 },
    build: buildReleaseGrade,
  },
  {
    id: 'profile-hero-640',
    section: 'profile',
    size: { width: 640, height: 522 },
    build: () => buildProfileHeroDocument('profile-hero-640'),
  },
  {
    id: 'profile-hero-400',
    section: 'profile',
    size: { width: 400, height: 327 },
    build: () => buildProfileHeroDocument('profile-hero-400'),
  },
  {
    id: 'profile-hero-fluid-100',
    section: 'profile',
    size: { width: 1600, height: 1392 },
    build: () => buildProfileHeroDocument('profile-hero-fluid-100'),
  },
  {
    id: 'section-title-illustrated',
    section: 'section-title',
    size: { width: 600, height: 654 },
    build: buildSectionTitle,
    partial: true,
  },
  {
    id: GITHUB_TEMPLATE_ID,
    section: 'github',
    size: formatSize('poster'),
    build: () => buildGithubProjectDocument(null),
  },
];

/** One collapsible family of the gallery: its id and its seeds, in order. */
export interface TemplateSection {
  id: TemplateSectionId;
  templates: readonly TemplateDefinition[];
}

/**
 * The gallery grouped by family, one section per id of `TEMPLATE_SECTION_IDS`
 * — the panel renders these as the collapsible sections, in this order.
 * Derived from `TEMPLATES`, so the two can never disagree: every seed lands in
 * exactly one section and the unit test holds the counts.
 */
export const TEMPLATE_SECTIONS: readonly TemplateSection[] = TEMPLATE_SECTION_IDS.map((id) => ({
  id,
  templates: TEMPLATES.filter((template) => template.section === id),
}));

export function findTemplate(templateId: TemplateId): TemplateDefinition {
  const template = TEMPLATES.find((candidate) => candidate.id === templateId);

  if (!template) {
    throw new Error(`unknown template: ${templateId}`);
  }

  return template;
}
