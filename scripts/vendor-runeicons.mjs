#!/usr/bin/env node
/**
 * Vendors the Runeicons "Part 1" data (the Icons — Apache-2.0, no additional
 * conditions) from a local clone of https://github.com/Runeicons/runeicons:
 *
 *   public/runeicons/<style>/**         919 SVG files, copied 1:1
 *   src/lib/runeicons/manifest.ts       generated catalog (metadata only)
 *
 * Only the upstream paths covered by Part 1 are read: `public/{normal,duotone,
 * fill,pixelated,glass-icons}/**` and `lib/icons/manifest.generated.ts`. The
 * "Site Software" (Part 2 — pages, components, animations) and the third-party
 * brand logos (Part 3) are never touched. The SVGs are served as static files
 * and fetched by id at runtime, so they never enter the app bundle.
 *
 * This script is the gate of the vendored contract: a file with executable
 * content or with paint the panel's slot rewrite cannot see (`<style>` element
 * or `class`; see `src/lib/runeicons/svg.ts`) aborts the vendoring.
 *
 * Usage: node scripts/vendor-runeicons.mjs <path-to-runeicons-clone>
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const STYLES = ['normal', 'duotone', 'fill', 'pixelated', 'glass-icons'];
const MANIFEST_SOURCE = 'lib/icons/manifest.generated.ts';

const root = resolve(import.meta.dirname, '..');
const cloneArg = process.argv[2];

if (!cloneArg) {
  console.error('usage: node scripts/vendor-runeicons.mjs <path-to-runeicons-clone>');
  process.exit(2);
}

const clone = resolve(cloneArg);

if (!existsSync(join(clone, MANIFEST_SOURCE)) || !existsSync(join(clone, 'LICENSE'))) {
  console.error(`not a runeicons clone (missing ${MANIFEST_SOURCE} or LICENSE): ${clone}`);
  process.exit(2);
}

function gitInfo() {
  try {
    const commit = execFileSync('git', ['-C', clone, 'rev-parse', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const date = execFileSync('git', ['-C', clone, 'log', '-1', '--format=%cs'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    return { commit: commit.slice(0, 7), date };
  } catch {
    return { commit: 'unknown', date: 'unknown' };
  }
}

/** Reads one `export const NAME: T[] = [...]` array out of the generated manifest. */
function readManifestArray(name) {
  const text = readFileSync(join(clone, MANIFEST_SOURCE), 'utf8');
  const start = text.indexOf(`export const ${name}:`);
  if (start < 0) throw new Error(`manifest array not found: ${name}`);

  const open = text.indexOf('= [', start) + 2;
  const end = text.indexOf('];', open);
  // The upstream file is TypeScript: its arrays may carry trailing commas.
  return JSON.parse(text.slice(open, end + 1).replace(/,\s*\]$/, ']'));
}

const normalEntries = readManifestArray('NORMAL_ICONS_MANIFEST');
const glassEntries = readManifestArray('GLASS_ICONS_MANIFEST');

// --- copy the artwork -------------------------------------------------------

const targetRoot = join(root, 'public', 'runeicons');
rmSync(targetRoot, { recursive: true, force: true });

const counts = {};
let copied = 0;
const unsafe = [];
const paintGaps = [];

for (const style of STYLES) {
  const source = join(clone, 'public', style);
  if (!existsSync(source)) throw new Error(`missing source directory: ${source}`);

  cpSync(source, join(targetRoot, style), { recursive: true });
  counts[style] = 0;

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.svg')) continue;

      counts[style] += 1;
      copied += 1;

      // The preview inlines the fetched markup, so the vendored set is also
      // checked for executable content before it is trusted on the page.
      const text = readFileSync(full, 'utf8');
      if (/<script|javascript:|\son\w+\s*=/i.test(text)) {
        unsafe.push(full.slice(clone.length + 1));
      }

      // The panel rewrites paint by `stroke`/`fill` value (quotes, case and
      // inline `style` variations included); paint that lives in a `<style>`
      // element or a `class` would silently keep the designed colors, so those
      // files are refused here — this script is the gate of that contract.
      if (/<style\b/i.test(text) || /\bclass\s*=/i.test(text)) {
        paintGaps.push(full.slice(clone.length + 1));
      }
    }
  };

  walk(source);
}

if (unsafe.length > 0) {
  console.error('refusing to vendor SVGs with executable content:');
  for (const file of unsafe) console.error(`  ${file}`);
  process.exit(1);
}

if (paintGaps.length > 0) {
  console.error('refusing to vendor SVGs whose paint the panel cannot rewrite (style element / class attribute):');
  for (const file of paintGaps) console.error(`  ${file}`);
  process.exit(1);
}

// --- generate the local manifest -------------------------------------------

const entries = [];

for (const entry of normalEntries) {
  const styles = ['normal', 'duotone', 'fill', 'pixelated'].filter(
    (style) => entry.availability[style],
  );

  entries.push({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    tags: entry.tags,
    styles,
    folder: entry.folder,
    file: `${entry.basename}.svg`,
  });
}

for (const entry of glassEntries) {
  entries.push({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    tags: entry.tags,
    styles: ['glass'],
    folder: 'glass-icons',
    file: entry.filename,
  });
}

entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const categories = [...new Set(entries.map((entry) => entry.category))].sort();
const { commit, date } = gitInfo();

const lines = [
  '// AUTO-GENERATED by scripts/vendor-runeicons.mjs — do not edit by hand.',
  '//',
  '// Source: Runeicons (https://github.com/Runeicons/runeicons)',
  `// @ ${commit} (${date}) — "the Icons", Part 1 of the upstream license`,
  '// (Apache License 2.0, no additional conditions). Artwork vendored 1:1 into',
  `// public/runeicons/** (${copied} files: ${STYLES.map((style) => `${style} ${counts[style]}`).join(', ')}).`,
  '// The upstream "Site Software" (Part 2) and brand logos (Part 3) did not enter',
  '// this repository; see NOTICE.',
  '',
  "export type RuneiconStyle = 'normal' | 'duotone' | 'fill' | 'pixelated' | 'glass';",
  '',
  'export type RuneiconCategory =',
  ...categories.map((category, index) => `  | '${category}'${index === categories.length - 1 ? ';' : ''}`),
  '',
  'export interface RuneiconEntry {',
  '  /** Canonical id from the upstream manifest. */',
  '  id: string;',
  '  /** Display name from the upstream manifest. */',
  '  name: string;',
  '  category: RuneiconCategory;',
  '  /** Upstream tags (category plus name words), searched by the panel. */',
  '  tags: string[];',
  '  /** Styles this icon ships in; never empty. */',
  '  styles: RuneiconStyle[];',
  '  /** Folder inside each style directory. */',
  '  folder: string;',
  '  /** File name inside the folder. */',
  '  file: string;',
  '}',
  '',
  'export const RUNEICON_ENTRIES: readonly RuneiconEntry[] = [',
  ...entries.map(
    (entry) =>
      `  { id: ${JSON.stringify(entry.id)}, name: ${JSON.stringify(entry.name)}, category: ${JSON.stringify(entry.category)}, tags: ${JSON.stringify(entry.tags)}, styles: ${JSON.stringify(entry.styles)}, folder: ${JSON.stringify(entry.folder)}, file: ${JSON.stringify(entry.file)} },`,
  ),
  '];',
  '',
];

const manifestTarget = join(root, 'src', 'lib', 'runeicons', 'manifest.ts');
mkdirSync(join(root, 'src', 'lib', 'runeicons'), { recursive: true });
writeFileSync(manifestTarget, lines.join('\n'), 'utf8');

console.log(`vendored ${copied} SVGs into public/runeicons/ (${STYLES.map((style) => `${style}=${counts[style]}`).join(' ')})`);
console.log(`generated src/lib/runeicons/manifest.ts: ${entries.length} entries, ${categories.length} categories, source ${commit} (${date})`);
