import { describe, expect, it } from 'vitest';
import { parseDocument, serializeDocument, type DocumentPage } from '@/lib/document';
import { rotatedBounds } from '@/test/rotatedBounds';
import {
  GITHUB_SECTION_ID,
  GITHUB_TEMPLATE_ID,
  TEMPLATES,
  TEMPLATE_SECTIONS,
  TEMPLATE_SECTION_IDS,
  buildGithubProjectDocument,
  buildProfileHeroDocument,
  findTemplate,
  heroPlaceholderSrc,
  slotPlaceholderSrc,
  sponsorLogoSrc,
  type ProfileHeroTemplateId,
  type TemplateId,
} from '@/lib/templates';

/**
 * Declared widths of the README hero preset (P1 of the readme-hero study):
 * the measured small variants, the default band, the showcase and the fluid
 * source. Independent literals — the seeds must reproduce them, not the other
 * way around.
 */
const README_HERO_WIDTHS: Record<string, number> = {
  'readme-hero-369': 369,
  'readme-hero-430': 430,
  'readme-hero-720': 720,
  'readme-hero-840': 840,
  'readme-hero-1200': 1200,
  'readme-hero-fluid-100': 1600,
};

/**
 * README demo (P4) and sponsors (P5) presets: the measured 600w demo slot and
 * the sponsor treatments (32w logos, 440w banner), with the names, links and
 * alt of the seed. Independent literals, like the hero widths above.
 */
const DEMO_ID = 'readme-demo-600';
const SPONSORS_ID = 'sponsors-table';
const DEMO_ALT = 'Demo: quick switch between light and dark.';
const SPONSOR_NAMES = ['Aurora', 'Basalt', 'Cobalt'];
const SPONSOR_LINKS = ['aurora.example', 'basalt.example', 'cobalt.example'];
const BANNER_LINK = 'nimbus.example';

/**
 * Release (P6), profile (P7) and illustrated section title (P8) presets:
 * independent literals of the measured specs — the seeds must reproduce
 * them, not the other way around.
 */
const RELEASE_ID = 'release-grade';
const RELEASE_VERSION = 'v1.4.0';
const RELEASE_ATTACHMENT_NAMES = [
  'project-v1.4.0.zip',
  'project-v1.4.0-setup.exe',
  'project-v1.4.0-manual.pdf',
];
const PROFILE_HERO_WIDTHS: Record<string, number> = {
  'profile-hero-640': 640,
  'profile-hero-400': 400,
  'profile-hero-fluid-100': 1600,
};
const PROFILE_FLUID_ID = 'profile-hero-fluid-100';
const TITLE_ID = 'section-title-illustrated';
/** The measured logo band of the partial title (agent-substrate 260 … NVIDIA 430). */
const TITLE_LOGO_MIN = 260;
const TITLE_LOGO_MAX = 430;

/**
 * Animated README presets (P-webp2/P-webp3 of the webp study): the measured
 * hero-anim band (760/800 + the fluid 100%) and the demo percentages of the
 * column (newtube 23%, OpenWBT 80%), each declaring the animated WebP slot
 * and its named static fallback. Independent literals, like the families
 * above.
 */
const HERO_ANIM_WIDTHS: Record<string, number> = {
  'readme-hero-anim-760': 760,
  'readme-hero-anim-800': 800,
  'readme-hero-anim-fluid-100': 1600,
};
const HERO_ANIM_FLUID_ID = 'readme-hero-anim-fluid-100';
/** Named static fallbacks of the animated pairs (P-webp2). */
const HERO_ANIM_FALLBACK = 'hero.png';
const DEMO_ANIM_FALLBACK = 'demo.png';
/** Alt of the animated slots (P-webp4): the alt says the slot is animated. */
const HERO_ANIM_ALT = 'Animated hero: light and dark theme switch.';
const DEMO_ANIM_ALT = 'Animated demo: quick switch between light and dark.';
/** The measured demo widths as percentages of the README column. */
const DEMO_ANIM_PERCENTS: Record<string, number> = {
  'readme-demo-anim-23': 23,
  'readme-demo-anim-80': 80,
};

const SLOT_PLACEHOLDER_PREFIX = 'data:image/svg+xml;charset=utf-8,';

/** The declared `width="100%"` seed: the only full-bleed hero. */
const FLUID_HERO_ID = 'readme-hero-fluid-100';

function heroTemplates() {
  return TEMPLATES.filter(
    (template) =>
      template.id.startsWith('readme-hero-') && !template.id.startsWith('readme-hero-anim-'),
  );
}

function animHeroTemplates() {
  return TEMPLATES.filter((template) => template.id.startsWith('readme-hero-anim-'));
}

function expectInsidePage(page: DocumentPage) {
  for (const object of page.objects) {
    const bounds = rotatedBounds(object);
    const tolerance = 0.5;

    expect(bounds.minX, `${object.name} left`).toBeGreaterThanOrEqual(-tolerance);
    expect(bounds.minY, `${object.name} top`).toBeGreaterThanOrEqual(-tolerance);
    expect(bounds.maxX, `${object.name} right`).toBeLessThanOrEqual(page.width + tolerance);
    expect(bounds.maxY, `${object.name} bottom`).toBeLessThanOrEqual(page.height + tolerance);
  }
}

describe('template gallery', () => {
  it('registers twenty-eight own starters plus the GitHub project template', () => {
    const ids = TEMPLATES.map((template) => template.id);

    expect(TEMPLATES).toHaveLength(29);
    expect(ids).toContain(GITHUB_TEMPLATE_ID);
    expect(new Set(ids).size).toBe(TEMPLATES.length);
    // Reading order of the README seeds: each animated family follows its
    // static counterpart, the demo comes after the heroes, the sponsors
    // section after it, the release notes after the sponsors — and the
    // GitHub project closes the gallery.
    expect(ids.indexOf('readme-hero-anim-760')).toBeGreaterThan(ids.indexOf(FLUID_HERO_ID));
    expect(ids.indexOf(DEMO_ID)).toBeGreaterThan(ids.indexOf('readme-hero-anim-760'));
    expect(ids.indexOf('readme-demo-anim-23')).toBeGreaterThan(ids.indexOf(DEMO_ID));
    expect(ids.indexOf(DEMO_ID)).toBeLessThan(ids.indexOf(SPONSORS_ID));
    expect(ids.indexOf(SPONSORS_ID)).toBeLessThan(ids.indexOf(RELEASE_ID));
    expect(ids.at(-1)).toBe(GITHUB_TEMPLATE_ID);
  });

  it('builds one content page per template, sized to its declared page', () => {
    for (const template of TEMPLATES) {
      const document = template.build();

      expect(document.pages, template.id).toHaveLength(1);

      const page = document.pages[0];

      expect({ width: page.width, height: page.height }, template.id).toEqual(template.size);
      expect(page.name.length, template.id).toBeGreaterThan(0);
      expect(page.background.kind, template.id).toBe('solid');
      if (page.background.kind === 'solid') {
        expect(page.background.color, template.id).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(page.objects.length, template.id).toBeGreaterThan(0);
      expectInsidePage(page);
    }
  });

  it('round-trips every seed through serialize -> parse without loss', () => {
    for (const template of TEMPLATES) {
      const document = template.build();

      expect(parseDocument(serializeDocument(document)), template.id).toEqual(document);
    }
  });

  it('generates fresh ids per build so the same template applies twice', () => {
    for (const template of TEMPLATES) {
      const first = template.build();
      const second = template.build();

      expect(first.pages[0].id, template.id).not.toBe(second.pages[0].id);
      expect(first.pages[0].objects[0].id, template.id).not.toBe(second.pages[0].objects[0].id);
    }
  });

  it('fills the GitHub template slots from a repo summary', () => {
    const filled = buildGithubProjectDocument({
      fullName: 'mafhper/fremit',
      description: 'Link and screenshot mockups.',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 128,
      forks: 12,
    });
    const page = filled.pages[0];
    const texts = page.objects.filter((object) => object.type === 'text').map((object) => object.text);
    const dot = page.objects.find((object) => object.name === 'Language dot');

    expect(texts).toContain('mafhper/fremit');
    expect(texts).toContain('Link and screenshot mockups.');
    expect(texts).toContain('TypeScript');
    expect(texts).toContain('\u2605 128 \u00b7 12 forks');
    expect(dot).toMatchObject({ type: 'shape', fill: '#3178c6' });
    expect(parseDocument(serializeDocument(filled))).toEqual(filled);
  });

  it('prints the zero counts of a fresh repository as zeros, not the placeholder', () => {
    // The real `GET /repos/mafhper/fremit` payload (fetched 2026-10-18): a
    // young repo with zero stars and zero forks keeps the real zeros.
    const page = buildGithubProjectDocument({
      fullName: 'mafhper/fremit',
      description: 'Browser mockup generator',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 0,
      forks: 0,
    }).pages[0];
    const texts = page.objects.filter((object) => object.type === 'text').map((object) => object.text);

    expect(texts).toContain('\u2605 0 \u00b7 0 forks');
    expect(texts).not.toContain('\u2605 128 \u00b7 12 forks');
  });

  it('keeps the placeholders when there is no repo summary', () => {
    const page = buildGithubProjectDocument(null).pages[0];
    const texts = page.objects.filter((object) => object.type === 'text').map((object) => object.text);

    expect(texts).toContain('owner/repo');
    expect(texts).toContain('Short description of the project.');
    expect(texts).toContain('Language');
  });

  it('finds a template by id and rejects an unknown one', () => {
    const id: TemplateId = 'quote-card';

    expect(findTemplate(id).id).toBe(id);
    expect(() => findTemplate('missing' as TemplateId)).toThrow(/unknown template/);
  });
});

describe('README hero seeds', () => {
  it('declares the measured widths of the readme-hero preset', () => {
    const heroes = heroTemplates();

    expect(heroes.map((hero) => hero.id)).toEqual(Object.keys(README_HERO_WIDTHS));

    for (const hero of heroes) {
      const page = hero.build().pages[0];

      expect(page.width, hero.id).toBe(README_HERO_WIDTHS[hero.id]);
      expect(page.height, hero.id).toBeGreaterThan(0);
    }
  });

  it('puts the hero image at the top, after the title, with its width declared', () => {
    for (const template of heroTemplates()) {
      const page = template.build().pages[0];
      const accent = page.objects.find((object) => object.name === 'Accent bar');
      const title = page.objects.find((object) => object.name === 'Project name');
      const tagline = page.objects.find((object) => object.name === 'Tagline');
      const image = page.objects.find((object) => object.type === 'image');

      expect(accent, template.id).toBeDefined();
      expect(title, template.id).toBeDefined();
      expect(tagline, template.id).toBeDefined();
      expect(image, template.id).toBeDefined();
      if (!accent || !title || !tagline || !image) continue;

      // The top of the card: the accent bar sits on the margin, the title
      // comes after it, then the stack of the measured position (title, then
      // the hero below it).
      const margin = Math.round(page.width * 0.055);

      expect(accent.y, template.id).toBe(margin);
      expect(title.y, template.id).toBeGreaterThan(accent.y);
      expect(title.y + title.height, template.id).toBeLessThanOrEqual(tagline.y);
      expect(tagline.y + tagline.height, template.id).toBeLessThanOrEqual(image.y);
      // The slot declares its width inside the page and leaves a bottom margin.
      expect(image.x, template.id).toBeGreaterThanOrEqual(0);
      expect(image.x + image.width, template.id).toBeLessThanOrEqual(page.width);
      expect(image.y + image.height, template.id).toBeLessThan(page.height);
      expect(image.fit, template.id).toBe('cover');
      // The slot is half as tall as it is wide (the 2:1 banner ratio).
      expect(Math.abs(image.height - image.width / 2), template.id).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the fluid hero full-bleed and every fixed hero inside its margins', () => {
    for (const template of heroTemplates()) {
      const page = template.build().pages[0];
      const image = page.objects.find((object) => object.type === 'image');

      expect(image, template.id).toBeDefined();
      if (!image) continue;

      if (template.id === FLUID_HERO_ID) {
        // The `width="100%"` seed: the slot runs edge to edge.
        expect(image.x, template.id).toBe(0);
        expect(image.width, template.id).toBe(page.width);
      } else {
        // Every fixed seed leaves a margin on both sides of the slot.
        expect(image.x, template.id).toBeGreaterThan(0);
        expect(image.x + image.width, template.id).toBeLessThan(page.width);
      }
    }
  });

  it('builds the image slot as a self-contained SVG placeholder of its size', () => {
    for (const template of heroTemplates()) {
      const page = template.build().pages[0];
      const image = page.objects.find((object) => object.type === 'image');

      expect(image, template.id).toBeDefined();
      if (!image || image.type !== 'image') continue;

      expect(image.src, template.id).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);

      const markup = decodeURIComponent(image.src.slice(SLOT_PLACEHOLDER_PREFIX.length));

      expect(markup, template.id).toContain('<svg');
      expect(markup, template.id).toContain(`width="${image.width}"`);
      expect(markup, template.id).toContain(`height="${image.height}"`);
      expect(markup, template.id).toContain('Hero image');
    }
  });

  it('escapes every placeholder input so hostile values cannot break the markup', () => {
    const src = heroPlaceholderSrc(
      {
        pageName: 'Injection',
        width: 720,
        background: '#ffffff',
        titleFill: '#0f172a',
        taglineFill: '#475569',
        accentFill: '#4f46e5',
        placeholderFill: '"><script>alert(1)</script>',
        placeholderInk: '<script>alert(2)</script>',
      },
      640,
      320,
    );

    expect(src).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);

    const markup = decodeURIComponent(src.slice(SLOT_PLACEHOLDER_PREFIX.length));

    expect(markup).not.toContain('<script');
    expect(markup).not.toContain('script>');
    expect(markup).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(markup).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');

    // The shared slot primitive escapes the label and the title too.
    const slot = slotPlaceholderSrc(
      {
        fill: '#ffffff',
        ink: '#111111',
        label: '<script>alert(3)</script>',
        title: '"><script>alert(4)</script>',
        play: true,
      },
      600,
      338,
    );
    const slotMarkup = decodeURIComponent(slot.slice(SLOT_PLACEHOLDER_PREFIX.length));

    expect(slotMarkup).not.toContain('<script');
    expect(slotMarkup).toContain('&lt;script&gt;alert(3)&lt;/script&gt;');
    expect(slotMarkup).toContain('&quot;&gt;&lt;script&gt;alert(4)&lt;/script&gt;');

    // The sponsor logo escapes the name and the palette.
    const logo = sponsorLogoSrc(
      '"><script>alert(5)</script>',
      { fill: '<script>alert(6)</script>', ink: '&' },
      32,
      32,
    );
    const logoMarkup = decodeURIComponent(logo.slice(SLOT_PLACEHOLDER_PREFIX.length));

    expect(logoMarkup).not.toContain('<script');
    expect(logoMarkup).toContain('&quot;&gt;&lt;script&gt;alert(5)&lt;/script&gt; logo');
    expect(logoMarkup).toContain('&lt;script&gt;alert(6)&lt;/script&gt;');
  });

  it('rounds and clamps the placeholder dimensions against hostile numbers', () => {
    for (const size of [Number.NaN, 0, -48]) {
      const slot = slotPlaceholderSrc(
        { fill: '#ffffff', ink: '#111111', label: 'Slot' },
        size,
        size,
      );
      const slotMarkup = decodeURIComponent(slot.slice(SLOT_PLACEHOLDER_PREFIX.length));

      expect(slotMarkup, `slot ${String(size)}`).toContain('width="1" height="1"');
      expect(slotMarkup, `slot ${String(size)}`).toContain('viewBox="0 0 1 1"');
      expect(slotMarkup, `slot ${String(size)}`).not.toContain('NaN');

      const logo = sponsorLogoSrc('Aurora', { fill: '#ffffff', ink: '#111111' }, size, size);
      const logoMarkup = decodeURIComponent(logo.slice(SLOT_PLACEHOLDER_PREFIX.length));

      expect(logoMarkup, `logo ${String(size)}`).toContain('width="1" height="1"');
      expect(logoMarkup, `logo ${String(size)}`).toContain('viewBox="0 0 1 1"');
      expect(logoMarkup, `logo ${String(size)}`).not.toContain('NaN');
    }

    // A fractional dimension rounds to whole pixels instead of leaking the
    // fraction into the markup (the declared specs are integers; the
    // primitive does not rely on that).
    const fractional = slotPlaceholderSrc(
      { fill: '#ffffff', ink: '#111111', label: 'Slot' },
      600.4,
      338.6,
    );
    const fractionalMarkup = decodeURIComponent(
      fractional.slice(SLOT_PLACEHOLDER_PREFIX.length),
    );

    expect(fractionalMarkup).toContain('width="600"');
    expect(fractionalMarkup).toContain('height="339"');
    expect(fractionalMarkup).not.toContain('600.4');
  });
});

describe('README demo and sponsors seeds', () => {
  it('keeps the demo slot at 600w after the hero, never before', () => {
    const page = findTemplate(DEMO_ID).build().pages[0];
    const hero = page.objects.find((object) => object.name === 'Hero image');
    const demo = page.objects.find((object) => object.name === 'Demo video');

    expect(hero, DEMO_ID).toBeDefined();
    expect(demo, DEMO_ID).toBeDefined();
    if (!hero || !demo) return;

    // The measured 600w README column: the demo sits below the hero band and
    // keeps the 16:9 ratio of a video slot.
    expect(page.width, DEMO_ID).toBe(600);
    expect(hero.y, DEMO_ID).toBe(0);
    expect(demo.y, DEMO_ID).toBeGreaterThanOrEqual(hero.y + hero.height);
    expect(demo.width, DEMO_ID).toBe(600);
    expect(Math.abs(demo.height - (demo.width * 9) / 16), DEMO_ID).toBeLessThanOrEqual(1);
    expect(demo.y + demo.height, DEMO_ID).toBeLessThan(page.height);
  });

  it('carries the descriptive alt of the demo in the slot title and the caption', () => {
    const page = findTemplate(DEMO_ID).build().pages[0];
    const demo = page.objects.find((object) => object.name === 'Demo video');
    const caption = page.objects.find((object) => object.name === 'Demo caption');

    expect(demo?.type, DEMO_ID).toBe('image');
    if (!demo || demo.type !== 'image') return;

    const markup = decodeURIComponent(demo.src.slice(SLOT_PLACEHOLDER_PREFIX.length));

    expect(markup, DEMO_ID).toContain(`<title>${DEMO_ALT}</title>`);
    expect(markup, DEMO_ID).toContain('Demo video');
    // The play badge of the video slot (P4): the circle and the triangle.
    expect(markup, DEMO_ID).toContain('<circle');
    expect(markup, DEMO_ID).toContain('<path');
    expect(caption?.type, DEMO_ID).toBe('text');
    if (caption?.type === 'text') {
      expect(caption.text, DEMO_ID).toBe(DEMO_ALT);
    }
  });

  it('shares the hero band, the Demo heading and the caption band across the demo families', () => {
    // The common header of the family (P4/P-webp3) is extracted once; the
    // test pins that the static and the animated seeds still build it
    // identically — the extraction is only safe while they match.
    const ids = [DEMO_ID, ...Object.keys(DEMO_ANIM_PERCENTS)] as TemplateId[];
    const pages = ids.map((id) => findTemplate(id).build().pages[0]);

    for (const [index, page] of pages.entries()) {
      const id = ids[index];
      const hero = page.objects.find((object) => object.name === 'Hero image');
      const heading = page.objects.find((object) => object.name === 'Demo heading');
      const caption = page.objects.find((object) => object.name === 'Demo caption');

      expect(hero?.type, id).toBe('image');
      expect(heading?.type, id).toBe('text');
      expect(caption?.type, id).toBe('text');
      if (!hero || !heading || !caption) continue;

      // The declared geometry of the 600w column, as literals: the hero band
      // is full-bleed and 300 tall, the heading sits on the 30 margin below
      // it, and the caption band closes the column on the same margin.
      expect(page.width, id).toBe(600);
      expect({ x: hero.x, y: hero.y, width: hero.width, height: hero.height }, id).toEqual({
        x: 0,
        y: 0,
        width: 600,
        height: 300,
      });
      expect(
        { x: heading.x, y: heading.y, width: heading.width, height: heading.height },
        id,
      ).toEqual({ x: 30, y: 330, width: 540, height: 46 });
      expect({ x: caption.x, width: caption.width, height: caption.height }, id).toEqual({
        x: 30,
        width: 540,
        height: 24,
      });
      expect(heading.fontSize, id).toBe(36);
      expect(heading.fontWeight, id).toBe(800);
      expect(caption.fontSize, id).toBe(18);
      expect(caption.fill, id).toBe('#64748b');
    }

    // The header travels as one band per page — the extraction never
    // duplicates a piece of it — and it is equal across the three seeds.
    const headerOf = (page: DocumentPage) =>
      ['Hero image', 'Demo heading'].map((name) => {
        const object = page.objects.find((candidate) => candidate.name === name);

        return object
          ? {
              name,
              type: object.type,
              x: object.x,
              y: object.y,
              width: object.width,
              height: object.height,
              src: object.type === 'image' ? object.src : undefined,
              text: object.type === 'text' ? object.text : undefined,
            }
          : null;
      });

    for (const page of pages) {
      expect(page.objects.filter((object) => object.name === 'Hero image')).toHaveLength(1);
      expect(page.objects.filter((object) => object.name === 'Demo heading')).toHaveLength(1);
      expect(page.objects.filter((object) => object.name === 'Demo caption')).toHaveLength(1);
    }

    for (const page of pages.slice(1)) {
      expect(headerOf(page)).toEqual(headerOf(pages[0]));
    }
  });

  it('builds the sponsors section with 32w logos and a 440w banner, each with link and alt', () => {
    const page = findTemplate(SPONSORS_ID).build().pages[0];
    const heading = page.objects.find((object) => object.name === 'Sponsors heading');

    expect(heading?.type, SPONSORS_ID).toBe('text');
    if (heading?.type === 'text') {
      expect(heading.text, SPONSORS_ID).toBe('Sponsors');
    }

    const logos = page.objects.filter((object) => object.name === 'Sponsor logo');
    const links = page.objects.filter((object) => object.name === 'Sponsor link');

    expect(logos, SPONSORS_ID).toHaveLength(SPONSOR_NAMES.length);
    expect(links, SPONSORS_ID).toHaveLength(SPONSOR_LINKS.length);

    for (let index = 0; index < logos.length; index += 1) {
      const logo = logos[index];
      const link = links[index];

      expect(logo.type, SPONSORS_ID).toBe('image');
      expect({ width: logo.width, height: logo.height }, SPONSORS_ID).toEqual({
        width: 32,
        height: 32,
      });
      if (logo.type === 'image') {
        const markup = decodeURIComponent(logo.src.slice(SLOT_PLACEHOLDER_PREFIX.length));

        expect(markup, SPONSORS_ID).toContain(`<title>${SPONSOR_NAMES[index]} logo</title>`);
      }
      expect(link.type, SPONSORS_ID).toBe('text');
      if (link.type === 'text') {
        expect(link.text, SPONSORS_ID).toBe(SPONSOR_LINKS[index]);
      }
    }

    const banner = page.objects.find((object) => object.name === 'Sponsor banner');
    const bannerLink = page.objects.find((object) => object.name === 'Banner link');

    expect(banner?.type, SPONSORS_ID).toBe('image');
    if (banner?.type === 'image') {
      expect(banner.width, SPONSORS_ID).toBe(440);

      const markup = decodeURIComponent(banner.src.slice(SLOT_PLACEHOLDER_PREFIX.length));

      expect(markup, SPONSORS_ID).toContain('<title>Nimbus banner</title>');
    }
    expect(bannerLink?.type, SPONSORS_ID).toBe('text');
    if (bannerLink?.type === 'text') {
      expect(bannerLink.text, SPONSORS_ID).toBe(BANNER_LINK);
    }
  });

  it('trims the sponsor name before the monogram and the title', () => {
    const padded = sponsorLogoSrc('  Aurora  ', { fill: '#ffffff', ink: '#111111' }, 32, 32);
    const paddedMarkup = decodeURIComponent(padded.slice(SLOT_PLACEHOLDER_PREFIX.length));

    expect(paddedMarkup, 'sponsor logo').toContain('<title>Aurora logo</title>');
    expect(paddedMarkup, 'sponsor logo').toContain('>A</text>');

    // A name of only spaces: the monogram falls back to `?` and the title is
    // the bare word — the raw spaces never reach the markup and no leading
    // space survives the trim.
    const blank = sponsorLogoSrc('   ', { fill: '#ffffff', ink: '#111111' }, 32, 32);
    const blankMarkup = decodeURIComponent(blank.slice(SLOT_PLACEHOLDER_PREFIX.length));

    expect(blankMarkup, 'sponsor logo').toContain('>?</text>');
    expect(blankMarkup, 'sponsor logo').toContain('<title>logo</title>');
  });
});

describe('release, profile and illustrated title seeds', () => {
  it('keeps the release seed text-only, with the version and no mocked screenshot', () => {
    const page = findTemplate(RELEASE_ID).build().pages[0];

    // 0/17 measured latest releases carry an image: the seed has no image
    // object at all, so there is no screenshot to swap in.
    expect(page.objects.filter((object) => object.type === 'image')).toEqual([]);

    const texts = page.objects
      .filter((object) => object.type === 'text')
      .map((object) => object.text);

    expect(texts).toContain(`Release ${RELEASE_VERSION}`);
    expect(texts).toContain('Attachments');
  });

  it('names every release attachment with the version, each with SHA-256 and size', () => {
    const page = findTemplate(RELEASE_ID).build().pages[0];
    const names = page.objects.filter((object) => object.name === 'Attachment name');
    const hashes = page.objects.filter((object) => object.name === 'Attachment SHA');
    const sizes = page.objects.filter((object) => object.name === 'Attachment size');

    expect(names).toHaveLength(RELEASE_ATTACHMENT_NAMES.length);
    expect(hashes).toHaveLength(RELEASE_ATTACHMENT_NAMES.length);
    expect(sizes).toHaveLength(RELEASE_ATTACHMENT_NAMES.length);

    for (let index = 0; index < RELEASE_ATTACHMENT_NAMES.length; index += 1) {
      const name = names[index];
      const hash = hashes[index];
      const size = sizes[index];

      expect(name.type, RELEASE_ID).toBe('text');
      if (name.type === 'text') {
        expect(name.text, RELEASE_ID).toBe(RELEASE_ATTACHMENT_NAMES[index]);
        // An asset name without the version never resolves for a tag
        // (FRM-N4): every row carries it.
        expect(name.text, RELEASE_ID).toContain(RELEASE_VERSION);
      }

      expect(hash.type, RELEASE_ID).toBe('text');
      if (hash.type === 'text') {
        expect(hash.text, RELEASE_ID).toMatch(/^[0-9a-f]{64}$/);
      }

      expect(size.type, RELEASE_ID).toBe('text');
      if (size.type === 'text') {
        expect(size.text, RELEASE_ID).toMatch(/^[\d.]+ (kB|MB)$/);
      }
    }

    // Distinct digests: the grid is not the same row repeated.
    const digests = hashes.map((hash) => (hash.type === 'text' ? hash.text : ''));

    expect(new Set(digests).size).toBe(digests.length);
  });

  it('declares the measured profile widths, with the fluid one full-bleed', () => {
    const profiles = TEMPLATES.filter((template) => template.id.startsWith('profile-hero-'));

    expect(profiles.map((profile) => profile.id)).toEqual(Object.keys(PROFILE_HERO_WIDTHS));

    for (const profile of profiles) {
      const page = profile.build().pages[0];

      expect(page.width, profile.id).toBe(PROFILE_HERO_WIDTHS[profile.id]);
    }

    const fluid = findTemplate(PROFILE_FLUID_ID).build().pages[0];
    const fluidImage = fluid.objects.find((object) => object.type === 'image');

    expect(fluidImage, PROFILE_FLUID_ID).toBeDefined();
    if (fluidImage) {
      expect(fluidImage.x, PROFILE_FLUID_ID).toBe(0);
      expect(fluidImage.width, PROFILE_FLUID_ID).toBe(fluid.width);
    }
  });

  it('writes the profile copy: profile name and bio above the hero', () => {
    const page = findTemplate('profile-hero-640').build().pages[0];
    const title = page.objects.find((object) => object.name === 'Profile name');
    const bio = page.objects.find((object) => object.name === 'Bio');
    const hero = page.objects.find((object) => object.type === 'image');

    expect(title?.type).toBe('text');
    expect(bio?.type).toBe('text');
    expect(hero).toBeDefined();
    if (!title || !bio || !hero) return;

    expect(title.y).toBeLessThan(bio.y);
    expect(bio.y + bio.height).toBeLessThanOrEqual(hero.y);
  });

  it('keeps the profile stats off by default and on behind the explicit flag', () => {
    for (const id of Object.keys(PROFILE_HERO_WIDTHS) as ProfileHeroTemplateId[]) {
      const defaultPage = findTemplate(id).build().pages[0];

      // Measured in 1/3 of the profiles — rare, never the default.
      expect(defaultPage.objects.filter((object) => object.name === 'Streak stats'), id).toEqual([]);
      expect(defaultPage.objects.filter((object) => object.name === 'Star history'), id).toEqual([]);

      const withStats = buildProfileHeroDocument(id, { stats: true });
      const page = withStats.pages[0];
      const hero = page.objects.find((object) => object.type === 'image');
      const streak = page.objects.find((object) => object.name === 'Streak stats');
      const history = page.objects.find((object) => object.name === 'Star history');

      expect(hero, id).toBeDefined();
      expect(streak, id).toBeDefined();
      expect(history, id).toBeDefined();
      if (!hero || !streak || !history) continue;

      // The measured streak height (165), both slots after the hero.
      expect(streak.height, id).toBe(165);
      expect(streak.y, id).toBeGreaterThanOrEqual(hero.y + hero.height);
      expect(history.y, id).toBeGreaterThanOrEqual(streak.y + streak.height);
      expect(page.height, id).toBeGreaterThanOrEqual(history.y + history.height);
      expect(parseDocument(serializeDocument(withStats)), id).toEqual(withStats);
    }
  });

  it('keeps the illustrated title logo inside the measured 260-430 band', () => {
    const page = findTemplate(TITLE_ID).build().pages[0];
    const logo = page.objects.find((object) => object.name === 'Section logo');
    const heading = page.objects.find((object) => object.name === 'Section title');
    const screenshot = page.objects.find((object) => object.name === 'Screenshot');

    expect(logo?.type).toBe('image');
    expect(heading?.type).toBe('text');
    expect(screenshot?.type).toBe('image');
    if (!logo || !heading || !screenshot) return;

    expect(logo.width).toBeGreaterThanOrEqual(TITLE_LOGO_MIN);
    expect(logo.width).toBeLessThanOrEqual(TITLE_LOGO_MAX);

    // The screenshot keeps its intrinsic 16:10 ratio and is shown whole
    // (`contain`), never cropped to a declared band.
    expect(screenshot.width).toBeGreaterThan(logo.width);
    expect(screenshot.fit).toBe('contain');
    expect(Math.abs(screenshot.height - (screenshot.width * 10) / 16)).toBeLessThanOrEqual(1);

    // The stack: logo, then the heading, then the screenshot.
    expect(logo.y + logo.height).toBeLessThanOrEqual(heading.y);
    expect(heading.y + heading.height).toBeLessThanOrEqual(screenshot.y);
  });

  it('marks the illustrated title as partial, outside the hero families', () => {
    expect(findTemplate(TITLE_ID).partial).toBe(true);

    for (const template of TEMPLATES) {
      if (template.id === TITLE_ID) continue;
      expect(template.partial, template.id).toBeFalsy();
    }

    // The hero count stays the six declared-width seeds; the partial title is
    // not one of them (and neither are the profile seeds).
    expect(heroTemplates()).toHaveLength(6);
    expect(heroTemplates().some((hero) => hero.id === TITLE_ID)).toBe(false);
    expect(
      TEMPLATES.some((template) => template.id.startsWith('profile-hero-') && template.partial),
    ).toBe(false);
  });
});

describe('animated README hero and demo seeds', () => {
  it('declares the measured hero-anim widths, all at 700w or more without upscale', () => {
    const heroes = animHeroTemplates();

    expect(heroes.map((hero) => hero.id)).toEqual(Object.keys(HERO_ANIM_WIDTHS));

    for (const hero of heroes) {
      const page = hero.build().pages[0];

      expect(page.width, hero.id).toBe(HERO_ANIM_WIDTHS[hero.id]);
      // P-webp2 acceptance: the declared source renders at 700w or more
      // without upscaling (same criterion as the static hero family).
      expect(page.width, hero.id).toBeGreaterThanOrEqual(700);
    }
  });

  it('declares the animated hero slot with its alt and the named static fallback below it', () => {
    for (const template of animHeroTemplates()) {
      const page = template.build().pages[0];
      const accent = page.objects.find((object) => object.name === 'Accent bar');
      const title = page.objects.find((object) => object.name === 'Project name');
      const slot = page.objects.find((object) => object.name === 'Hero anim');
      const fallback = page.objects.find((object) => object.name === 'Static fallback');

      // The slot keeps the measured position of the family: top, after the
      // title, in the 2:1 banner ratio.
      expect(accent, template.id).toBeDefined();
      expect(title, template.id).toBeDefined();
      expect(slot?.type, template.id).toBe('image');
      expect(fallback?.type, template.id).toBe('text');
      if (!accent || !title || !slot || !fallback) continue;

      expect(title.y, template.id).toBeGreaterThan(accent.y);
      expect(slot.y, template.id).toBeGreaterThanOrEqual(title.y + title.height);
      expect(Math.abs(slot.height - slot.width / 2), template.id).toBeLessThanOrEqual(1);

      // P-webp4: the alt says the slot is animated and the label names the
      // animated file of the pair.
      if (slot.type === 'image') {
        const markup = decodeURIComponent(slot.src.slice(SLOT_PLACEHOLDER_PREFIX.length));

        expect(markup, template.id).toContain(`<title>${HERO_ANIM_ALT}</title>`);
        expect(markup, template.id).toContain('Hero anim (WebP)');
      }

      // The pair is declared: the animated WebP slot above, the named static
      // PNG fallback below (P-webp2).
      if (fallback.type === 'text') {
        expect(fallback.text, template.id).toBe(
          `Static fallback: ${HERO_ANIM_FALLBACK} (prefers-reduced-motion)`,
        );
      }
      expect(fallback.y, template.id).toBeGreaterThanOrEqual(slot.y + slot.height);
      expect(fallback.y + fallback.height, template.id).toBeLessThan(page.height);
    }
  });

  it('keeps the animated fluid hero full-bleed like the static fluid seed', () => {
    const page = findTemplate(HERO_ANIM_FLUID_ID).build().pages[0];
    const slot = page.objects.find((object) => object.name === 'Hero anim');

    expect(slot?.type).toBe('image');
    if (!slot) return;

    expect(slot.x).toBe(0);
    expect(slot.width).toBe(page.width);
  });

  it('keeps the animated demo after the static hero, at its declared percentage width', () => {
    for (const [id, percent] of Object.entries(DEMO_ANIM_PERCENTS)) {
      const page = findTemplate(id as TemplateId).build().pages[0];
      const hero = page.objects.find((object) => object.name === 'Hero image');
      const demo = page.objects.find((object) => object.name === 'Demo anim');
      const caption = page.objects.find((object) => object.name === 'Demo caption');
      const fallback = page.objects.find((object) => object.name === 'Static fallback');

      expect(hero?.type, id).toBe('image');
      expect(demo?.type, id).toBe('image');
      expect(caption?.type, id).toBe('text');
      expect(fallback?.type, id).toBe('text');
      if (!hero || !demo) continue;

      // The demo never precedes the hero (P-webp3) and its width is the
      // declared percentage of the README column, centered.
      expect(demo.y, id).toBeGreaterThanOrEqual(hero.y + hero.height);
      expect(demo.width, id).toBe(Math.round((page.width * percent) / 100));
      expect(demo.x, id).toBe(Math.round((page.width - demo.width) / 2));
      // The 16:9 ratio of a demo slot.
      expect(Math.abs(demo.height - (demo.width * 9) / 16), id).toBeLessThanOrEqual(1);

      // The descriptive alt travels twice (the slot title and the caption),
      // and the named static fallback closes the pair.
      if (demo.type === 'image') {
        const markup = decodeURIComponent(demo.src.slice(SLOT_PLACEHOLDER_PREFIX.length));

        expect(markup, id).toContain(`<title>${DEMO_ANIM_ALT}</title>`);
        expect(markup, id).toContain('Demo anim (WebP)');
      }
      if (caption?.type === 'text') {
        expect(caption.text, id).toBe(DEMO_ANIM_ALT);
      }
      if (fallback?.type === 'text') {
        expect(fallback.text, id).toBe(
          `Static fallback: ${DEMO_ANIM_FALLBACK} (prefers-reduced-motion)`,
        );
      }
    }
  });

  it('keeps the animated families out of the static hero count', () => {
    expect(animHeroTemplates()).toHaveLength(3);
    expect(heroTemplates().some((hero) => hero.id.startsWith('readme-hero-anim-'))).toBe(false);

    for (const template of animHeroTemplates()) {
      expect(template.partial, template.id).toBeFalsy();
    }
  });
});

/**
 * Families of the gallery, as the panel renders them: the nine collapsible
 * sections of the sidebar, in reading order. Independent literals of the
 * product decision — the seeds must be grouped to match them, not the other
 * way around.
 */
const SECTION_ORDER = [
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

const SECTION_COUNTS: Record<(typeof SECTION_ORDER)[number], number> = {
  own: 10,
  'readme-hero': 6,
  animated: 5,
  'readme-demo': 1,
  sponsors: 1,
  release: 1,
  profile: 3,
  'section-title': 1,
  github: 1,
};

describe('template gallery sections', () => {
  it('groups the gallery into the nine families of the reading order', () => {
    expect(TEMPLATE_SECTIONS.map((section) => section.id)).toEqual([...SECTION_ORDER]);
  });

  it('keeps the measured count of every family', () => {
    const counts = Object.fromEntries(
      TEMPLATE_SECTIONS.map((section) => [section.id, section.templates.length]),
    );

    expect(counts).toEqual(SECTION_COUNTS);
    expect(TEMPLATE_SECTIONS.reduce((total, section) => total + section.templates.length, 0)).toBe(
      TEMPLATES.length,
    );
  });

  it('places every seed in exactly one family, keeping the gallery order', () => {
    const seedOrder = TEMPLATES.map((template) => template.id);

    for (const template of TEMPLATES) {
      expect(TEMPLATE_SECTION_IDS, template.id).toContain(template.section);

      const owners = TEMPLATE_SECTIONS.filter((section) =>
        section.templates.some((candidate) => candidate.id === template.id),
      );
      expect(owners, template.id).toHaveLength(1);
    }

    // Each family lists its seeds in the order they appear in the gallery.
    for (const section of TEMPLATE_SECTIONS) {
      const indices = section.templates.map((template) => seedOrder.indexOf(template.id));
      expect([...indices].sort((a, b) => a - b), section.id).toEqual(indices);
    }
  });

  it('keeps the animated family as the hero and demo variants together', () => {
    const animated = TEMPLATE_SECTIONS.find((section) => section.id === 'animated');

    expect(animated?.templates.map((template) => template.id)).toEqual([
      'readme-hero-anim-760',
      'readme-hero-anim-800',
      'readme-hero-anim-fluid-100',
      'readme-demo-anim-23',
      'readme-demo-anim-80',
    ]);
  });

  it('keeps the GitHub project as the last family of the gallery', () => {
    const last = TEMPLATE_SECTIONS.at(-1);

    expect(last?.id).toBe(GITHUB_SECTION_ID);
    expect(last?.templates.map((template) => template.id)).toEqual([GITHUB_TEMPLATE_ID]);
    expect(findTemplate(GITHUB_TEMPLATE_ID).section).toBe(GITHUB_SECTION_ID);
  });

  it('opens the gallery on the own starters', () => {
    expect(TEMPLATE_SECTIONS[0]?.id).toBe('own');
  });
});
