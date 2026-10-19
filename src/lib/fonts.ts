/**
 * Font catalog of the editor: the system stacks the text presets, the
 * inspector font control and the brand kit all share. A stack is a CSS
 * `font-family` value built from fonts every platform ships — no download, no
 * new dependency — and `FONT_OPTIONS` is the same list every control offers,
 * so a preset font always has a matching entry in the font-family select.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

export const FONT_STACKS = {
  inter: 'Inter, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  trebuchet: '"Trebuchet MS", "Segoe UI", sans-serif',
  comic: '"Comic Sans MS", "Comic Sans", cursive',
  impact: 'Impact, "Arial Black", sans-serif',
  palatino: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  courier: '"Courier New", Courier, monospace',
} as const;

export type FontStackId = keyof typeof FONT_STACKS;

export interface FontOption {
  id: FontStackId;
  /** Proper name of the family — a name, not translated copy. */
  label: string;
  stack: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
  { id: 'inter', label: 'Inter', stack: FONT_STACKS.inter },
  { id: 'georgia', label: 'Georgia', stack: FONT_STACKS.georgia },
  { id: 'times', label: 'Times', stack: FONT_STACKS.times },
  { id: 'trebuchet', label: 'Trebuchet', stack: FONT_STACKS.trebuchet },
  { id: 'comic', label: 'Comic Sans', stack: FONT_STACKS.comic },
  { id: 'impact', label: 'Impact', stack: FONT_STACKS.impact },
  { id: 'palatino', label: 'Palatino', stack: FONT_STACKS.palatino },
  { id: 'courier', label: 'Courier', stack: FONT_STACKS.courier },
];
