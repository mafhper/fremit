/**
 * Tool registry of the canvas shell: one entry per rail panel, in rail order.
 *
 * The rail is data-driven, so a new panel lands here and nowhere else: the
 * button, the docked section, the i18n label and the test id are all derived
 * from the definition. `order` follows the reference reading order of the
 * product (most used first), not the reference project's numbering.
 *
 * Panels whose slice has not landed yet would point at a lazy placeholder and
 * stay `planned` (the section renders disabled); every rail panel is `ready`
 * today. Every heavy panel — templates, icons, brand and animate — comes
 * through `lazyPanel` with a `preload`, so the `/editor` chunk stays under its
 * gzip budget; the rail calls `preload` on hover/focus of the button. The
 * light drawers (text, shapes, images, background) ship inline with the shell.
 *
 * Rail icons are the vendored Runeicons where the normal set has a 1:1
 * counterpart (icons, images, layers, animate) and lucide elsewhere; both kinds
 * satisfy the shared `IconComponent` contract.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { Files, LayoutTemplate, PaintBucket, Palette, Shapes, Type } from 'lucide-react';
import type { ComponentType } from 'react';
import { RuneImagesIcon } from '@/components/icons/rune/Images';
import { RuneLayersIcon } from '@/components/icons/rune/Layers';
import { RuneLayoutGridIcon } from '@/components/icons/rune/LayoutGrid';
import { RuneSparklesIcon } from '@/components/icons/rune/Sparkles';
import type { IconComponent } from '@/components/icons/RuneIcon';
import { BackgroundPanel } from './BackgroundPanel';
import { ImagesPanel } from './ImagesPanel';
import { lazyPanel } from './lazyPanel';
import { ShapesPanel } from './ShapesPanel';
import { TextPanel } from './TextPanel';
import { LayersPanel } from '../LayersPanel';
import { PagesPanel } from '../PagesPanel';

export type PanelId =
  | 'templates'
  | 'text'
  | 'shapes'
  | 'icons'
  | 'images'
  | 'background'
  | 'brand'
  | 'animate'
  | 'pages'
  | 'layers';

/**
 * Content semantics only — the docked column uses one width for every panel.
 * `drawer` scrolls as one column and stays open while adding; `sidebar` lays
 * itself out.
 */
export type PanelPlacement = 'drawer' | 'sidebar';

/** `ready` ships functional; `planned` renders the disabled placeholder. */
export type PanelStatus = 'ready' | 'planned';

export interface PanelDefinition {
  id: PanelId;
  /** Lower comes first in the rail. */
  order: number;
  placement: PanelPlacement;
  icon: IconComponent;
  status: PanelStatus;
  component: ComponentType;
  /** Starts the download of a lazy panel; the rail calls it on hover/focus. */
  preload?: () => void;
}

/**
 * Own lazy chunk per heavy panel: templates, icons, brand and animate
 * never ride the `/editor` bundle. Every rail panel is `ready` today; the
 * `planned` status stays for a panel whose slice has not landed yet (its body
 * would be a placeholder behind the same `lazyPanel` seam).
 */
const TemplatesPanel = lazyPanel(() =>
  import('./TemplatesPanel').then((module) => ({ default: module.TemplatesPanel })),
);

const StickersPanel = lazyPanel(() =>
  import('./StickersPanel').then((module) => ({ default: module.StickersPanel })),
);

const BrandPanel = lazyPanel(() =>
  import('./BrandPanel').then((module) => ({ default: module.BrandPanel })),
);

const AnimatePanel = lazyPanel(() =>
  import('./AnimatePanel').then((module) => ({ default: module.AnimatePanel })),
);

export const SIDEBAR_PANELS: readonly PanelDefinition[] = [
  {
    id: 'templates',
    order: 5,
    placement: 'sidebar',
    icon: LayoutTemplate,
    status: 'ready',
    component: TemplatesPanel,
    preload: TemplatesPanel.preload,
  },
  {
    id: 'text',
    order: 10,
    placement: 'drawer',
    icon: Type,
    status: 'ready',
    component: TextPanel,
  },
  {
    id: 'shapes',
    order: 20,
    placement: 'drawer',
    icon: Shapes,
    status: 'ready',
    component: ShapesPanel,
  },
  {
    id: 'icons',
    order: 30,
    placement: 'sidebar',
    icon: RuneLayoutGridIcon,
    status: 'ready',
    component: StickersPanel,
    preload: StickersPanel.preload,
  },
  {
    id: 'images',
    order: 40,
    placement: 'drawer',
    icon: RuneImagesIcon,
    status: 'ready',
    component: ImagesPanel,
  },
  {
    id: 'background',
    order: 50,
    placement: 'drawer',
    icon: PaintBucket,
    status: 'ready',
    component: BackgroundPanel,
  },
  {
    id: 'brand',
    order: 70,
    placement: 'sidebar',
    icon: Palette,
    status: 'ready',
    component: BrandPanel,
    preload: BrandPanel.preload,
  },
  {
    id: 'animate',
    order: 75,
    placement: 'sidebar',
    icon: RuneSparklesIcon,
    status: 'ready',
    component: AnimatePanel,
    preload: AnimatePanel.preload,
  },
  {
    id: 'pages',
    order: 78,
    placement: 'sidebar',
    icon: Files,
    status: 'ready',
    component: PagesPanel,
  },
  {
    id: 'layers',
    order: 80,
    placement: 'sidebar',
    icon: RuneLayersIcon,
    status: 'ready',
    component: LayersPanel,
  },
];

/** Open on the first load: the layers of the page being edited. */
export const DEFAULT_PANEL_ID: PanelId = 'layers';

export function findPanel(panelId: PanelId | null): PanelDefinition | null {
  if (!panelId) return null;

  return SIDEBAR_PANELS.find((panel) => panel.id === panelId) ?? null;
}

/**
 * Rail toggle: clicking the open tool closes the dock; any other tool takes
 * its place. Kept pure so the shell state has one testable rule.
 */
export function togglePanel(activePanelId: PanelId | null, panelId: PanelId): PanelId | null {
  return activePanelId === panelId ? null : panelId;
}
