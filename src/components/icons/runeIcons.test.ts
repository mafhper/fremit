/**
 * Contract of the vendored Runeicons modules: the shared frame
 * (`RuneIcon.tsx`) owns the presentation — 24×24 viewBox, stroke 2 with round
 * caps/joins, `currentColor`, decorative by default — and every module under
 * `rune/` renders its vendored artwork through it. The frame is asserted via
 * `renderToStaticMarkup`, so the checks read the real output the app ships.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RuneCheckIcon } from './rune/Check';
import { RuneChevronDownIcon } from './rune/ChevronDown';
import { RuneChevronUpIcon } from './rune/ChevronUp';
import { RuneClipboardIcon } from './rune/Clipboard';
import { RuneCloudUploadIcon } from './rune/CloudUpload';
import { RuneCopyIcon } from './rune/Copy';
import { RuneEyeIcon } from './rune/Eye';
import { RuneEyeOffIcon } from './rune/EyeOff';
import { RuneGlobeIcon } from './rune/Globe';
import { RuneImageIcon } from './rune/Image';
import { RuneImagesIcon } from './rune/Images';
import { RuneLayersIcon } from './rune/Layers';
import { RuneLayoutGridIcon } from './rune/LayoutGrid';
import { RuneLink2Icon } from './rune/Link2';
import { RuneLockIcon } from './rune/Lock';
import { RuneLockOpenIcon } from './rune/LockOpen';
import { RuneMenuIcon } from './rune/Menu';
import { RuneMoonIcon } from './rune/Moon';
import { RunePlusIcon } from './rune/Plus';
import { RuneSparklesIcon } from './rune/Sparkles';
import { RuneSunIcon } from './rune/Sun';
import { RuneTrash2Icon } from './rune/Trash2';
import { RuneXIcon } from './rune/X';
import { RuneIcon, type IconComponent } from './RuneIcon';

const PROBE = createElement('path', { d: 'M4 4h16' });

/** The vendored set: upstream basename + module, one row per icon. */
const VENDORED: ReadonlyArray<readonly [string, IconComponent]> = [
  ['chevron-down', RuneChevronDownIcon],
  ['chevron-up', RuneChevronUpIcon],
  ['check', RuneCheckIcon],
  ['plus', RunePlusIcon],
  ['x', RuneXIcon],
  ['copy', RuneCopyIcon],
  ['link-2', RuneLink2Icon],
  ['clipboard', RuneClipboardIcon],
  ['lock', RuneLockIcon],
  ['lock-open', RuneLockOpenIcon],
  ['eye', RuneEyeIcon],
  ['eye-off', RuneEyeOffIcon],
  ['globe', RuneGlobeIcon],
  ['image', RuneImageIcon],
  ['images', RuneImagesIcon],
  ['layers-2', RuneLayersIcon],
  ['layout-grid', RuneLayoutGridIcon],
  ['menu', RuneMenuIcon],
  ['moon', RuneMoonIcon],
  ['sparkles', RuneSparklesIcon],
  ['sun', RuneSunIcon],
  ['trash-2', RuneTrash2Icon],
  ['cloud-upload', RuneCloudUploadIcon],
];

/** A `fill`/`stroke` value other than `none`/`currentColor` = own color. */
const OWN_COLOR = /(?:fill|stroke)="(?!none"|currentColor")[^"]*"/;

describe('RuneIcon frame', () => {
  it('is decorative by default: aria-hidden, no role, no label', () => {
    const markup = renderToStaticMarkup(createElement(RuneIcon, null, PROBE));

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role=');
    expect(markup).not.toContain('aria-label');
  });

  it('becomes a labelled image when `label` is passed', () => {
    const markup = renderToStaticMarkup(createElement(RuneIcon, { label: 'Layers' }, PROBE));

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Layers"');
    expect(markup).not.toContain('aria-hidden');
  });

  it('inherits the text color and takes its size from className', () => {
    const markup = renderToStaticMarkup(
      createElement(RuneIcon, { className: 'h-6 w-6 text-[hsl(var(--accent))]' }, PROBE),
    );

    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('h-6 w-6 text-[hsl(var(--accent))]');
    expect(markup).not.toMatch(OWN_COLOR);
  });
});

describe('vendored Runeicons (normal)', () => {
  it.each(VENDORED)('%s renders through the shared frame', (_basename, Component) => {
    const markup = renderToStaticMarkup(createElement(Component));

    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('stroke-width="2"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('<path d="M');
    expect(markup).not.toMatch(OWN_COLOR);
  });

  it('keeps the upstream geometry (spot checks against the source SVGs)', () => {
    expect(renderToStaticMarkup(createElement(RuneChevronDownIcon))).toContain('d="M6 9L12 15L18 9"');
    expect(renderToStaticMarkup(createElement(RuneChevronUpIcon))).toContain('d="M18 15L12 9L6 15"');
    expect(renderToStaticMarkup(createElement(RunePlusIcon))).toContain('d="M5 12H19M12 5V19"');
    expect(renderToStaticMarkup(createElement(RuneXIcon))).toContain('d="M18 6L6 18M6 6L18 18"');
    expect(renderToStaticMarkup(createElement(RuneCheckIcon))).toContain('d="M20 6L9 17L4 12"');
    expect(renderToStaticMarkup(createElement(RuneLockOpenIcon))).toContain('M7 10.9999V6.99991');
    expect(renderToStaticMarkup(createElement(RuneMenuIcon))).toContain('d="M4 5H20M4 12H20M4 19H20"');
    expect(renderToStaticMarkup(createElement(RuneSunIcon))).toContain('M12 2V4M12 20V22');
    expect(renderToStaticMarkup(createElement(RuneMoonIcon))).toContain('M20.985 12.486');
    expect(renderToStaticMarkup(createElement(RuneGlobeIcon))).toContain('M22 12C22 17.5228');
    expect(renderToStaticMarkup(createElement(RuneCopyIcon))).toContain('M4 16C2.9 16 2 15.1 2 14V4');
    expect(renderToStaticMarkup(createElement(RuneLink2Icon))).toContain('M9 17H7C5.67392 17');
    expect(renderToStaticMarkup(createElement(RuneClipboardIcon))).toContain('M16 4H18C18.5304 4');
    expect(renderToStaticMarkup(createElement(RuneLockIcon))).toContain('M7 11V7C7 5.67392');
    expect(renderToStaticMarkup(createElement(RuneEyeIcon))).toContain('M2.06202 12.3481');
    expect(renderToStaticMarkup(createElement(RuneEyeOffIcon))).toContain('M10.733 5.07599');
    expect(renderToStaticMarkup(createElement(RuneImageIcon))).toContain('M21 14.9999L17.914');
    expect(renderToStaticMarkup(createElement(RuneImagesIcon))).toContain('M22 11.0001L20.704');
    expect(renderToStaticMarkup(createElement(RuneLayersIcon))).toContain('M20 14.2849L21.5 15.1299');
    expect(renderToStaticMarkup(createElement(RuneLayoutGridIcon))).toContain('d="M9 3H4C3.44772 3');
    expect(renderToStaticMarkup(createElement(RuneSparklesIcon))).toContain('M20 2V6M22 4H18');
    expect(renderToStaticMarkup(createElement(RuneTrash2Icon))).toContain('M10 11V17M14 11V17');
    expect(renderToStaticMarkup(createElement(RuneCloudUploadIcon))).toContain('M12 13V21M16 17L12 13L8 17');
  });
});
