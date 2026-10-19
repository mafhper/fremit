import { create } from 'zustand';
import { getViewportSize } from '@/lib/framePresets';
import { createImageObject, type DocumentObject, type DocumentPage, type FremitDocument, type PageBackground, type PageTransition } from '@/lib/document';
import type { RepoSummary } from '@/lib/githubRepo';
import {
  addObjectsToPage,
  addPage as addPageToDocument,
  addTemplatePage as addTemplatePageToDocument,
  duplicateObjectInPage,
  duplicatePage as duplicateDocumentPage,
  findPage,
  moveObjectInPage,
  movePage as moveDocumentPage,
  removeObjectFromPage,
  renamePage as renameDocumentPage,
  replacePage,
  resizePageToFormat,
  setPageBackgroundInPage,
  setPageTransitionInPage,
  updateObjectInPage,
  type DocumentObjectPatch,
  type PageFormatId,
} from '@/lib/documentOps';
import { createStarterDocument } from '@/lib/starterDocument';
import {
  ImageReplaceError,
  replaceImageSourceInPage,
  type ImageReplaceResult,
} from '@/lib/imageReplace';
import type {
  AppShellState,
  BackgroundState,
  CaptureDelay,
  DesktopChromePreset,
  DevicePreset,
  ExportFormat,
  ExportScale,
  FrameFamily,
  FrameOrientation,
  FrameState,
  ResolvedSource,
  SourceMode,
  SourceState,
  ThemePreference,
  ViewportPreset,
} from '@/types/app';

export type {
  BackgroundType,
  DesktopChromePreset,
  DevicePreset,
  ExportFormat,
  ExportScale,
  FitMode,
  FrameFamily,
  FrameOrientation,
  ResolvedSource,
  ShadowSize,
  SourceMode,
  SourceStatus,
  SourceStrategy,
  ViewportPreset,
} from '@/types/app';

/** What the animate panel asks the canvas to preview. */
export type AnimationPreviewKind = 'element' | 'page';

/**
 * One-shot preview request. The token makes every click a new request, so the
 * canvas replays the animation even when the panel asks for the same scope
 * twice in a row.
 */
export interface AnimationPreviewRequest {
  kind: AnimationPreviewKind;
  token: number;
}

/**
 * The GitHub repo loaded into the template gallery, with the input text it was
 * loaded from. The panel keeps it while the input still names that repo, so
 * the gallery card (thumbnail and applied seed) reflects the provided data
 * until the repo changes or the data is cleared.
 */
export interface GithubRepoState {
  /** The repo input exactly as it was loaded (trimmed). */
  input: string;
  summary: RepoSummary;
}

interface AppState {
  source: SourceState;
  frame: FrameState;
  background: BackgroundState;
  export: {
    format: ExportFormat;
    scale: ExportScale;
  };
  appShell: AppShellState;
  /** Documento JSON rendered by the dedicated canvas at `/editor`. */
  document: FremitDocument;
  activePageId: string;
  selectedObjectId: string | null;
  setDraftUrl: (value: string) => void;
  setCaptureDelay: (value: CaptureDelay) => void;
  setCaptureSelector: (value: string) => void;
  startSourceLoading: (mode: SourceMode, pendingUrl?: string | null) => void;
  commitResolvedSource: (resolved: ResolvedSource) => void;
  failSourceLoading: (code: string, message: string) => void;
  clearSourceError: () => void;
  setFrameFamily: (family: FrameFamily) => void;
  setDesktopChromePreset: (preset: DesktopChromePreset) => void;
  setDevicePreset: (preset: DevicePreset) => void;
  setOrientation: (orientation: FrameOrientation) => void;
  setViewportPreset: (preset: ViewportPreset) => void;
  setCustomViewport: (dimension: 'width' | 'height', value: number) => void;
  updateFrame: (config: Partial<FrameState>) => void;
  updateBackground: (config: Partial<BackgroundState>) => void;
  updateExport: (config: Partial<{ format: ExportFormat; scale: ExportScale }>) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setActivePage: (pageId: string) => void;
  addPage: () => void;
  /** Appends a page built from a template seed and makes it the active page. */
  addTemplatePage: (page: DocumentPage) => void;
  duplicatePage: (pageId: string) => void;
  movePage: (pageId: string, direction: 'up' | 'down') => void;
  renamePage: (pageId: string, name: string) => void;
  resizePage: (pageId: string, format: PageFormatId) => void;
  setPageBackground: (pageId: string, background: PageBackground) => void;
  /** Sets or clears the page transition (schema v2); `null` is "None". */
  setPageTransition: (pageId: string, transition: PageTransition | null) => void;
  addObject: (object: DocumentObject) => void;
  /** Inserts a group (a pairing, a paste) in one write; selects the last object. */
  addObjects: (objects: DocumentObject[]) => void;
  updateObject: (objectId: string, patch: DocumentObjectPatch) => void;
  removeObject: (objectId: string) => void;
  moveObjectZ: (objectId: string, direction: 'up' | 'down') => void;
  /** Duplicates the object right above itself and selects the copy. */
  duplicateObject: (objectId: string) => void;
  /**
   * Swaps the source of one image object in place (id, geometry, order and
   * selection stay put) and reports a typed failure instead of writing when
   * the target is missing or is not an image.
   */
  replaceImageSource: (objectId: string, src: string) => ImageReplaceResult;
  selectObject: (objectId: string | null) => void;
  upsertSourceImage: (src: string, name: string) => void;
  /** Latest preview request; the canvas plays it and never writes the document. */
  animationPreview: AnimationPreviewRequest | null;
  requestAnimationPreview: (kind: AnimationPreviewKind) => void;
  /** Presentation mode: the canvas plays the page and pages navigate by hand. */
  presenting: boolean;
  startPresenting: () => void;
  stopPresenting: () => void;
  /** The GitHub repo the gallery reflects; `null` = the seed's placeholders. */
  githubRepo: GithubRepoState | null;
  setGithubRepo: (loaded: GithubRepoState | null) => void;
}

const themeStorageKey = 'fremit.theme';

function getSystemTheme(): ThemePreference {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(themeStorageKey);
  return stored === 'dark' || stored === 'light' ? stored : getSystemTheme();
}

const defaultFrame: FrameState = {
  family: 'desktop-browser',
  desktopChromePreset: 'mac',
  devicePreset: 'phone',
  orientation: 'portrait',
  viewportPreset: 'desktop',
  windowShadow: 'lg',
  windowRadius: 26,
  darkMode: true,
  showTitle: true,
  windowTitle: 'Fremit preview',
  windowWidth: 1440,
  windowHeight: 900,
  fitMode: 'contain',
  imageZoom: 100,
  imagePositionX: 50,
  imagePositionY: 50,
  showDeviceCamera: false,
};

const defaultBackground: BackgroundState = {
  bgType: 'gradient',
  bgColor: '#faf4ea',
  bgGradient: 'linear-gradient(135deg, #f7f0e7 0%, #cfe2df 52%, #f2d3b1 100%)',
  bgGradientType: 'linear',
  bgGradientDirection: 135,
  bgImage: null,
  padding: 56,
};

const initialDocument = createStarterDocument();

function withViewport(frame: FrameState, next: Partial<FrameState>) {
  const merged = { ...frame, ...next };
  const { width, height } = getViewportSize(
    merged.family,
    merged.viewportPreset,
    merged.devicePreset,
    merged.orientation,
    { width: merged.windowWidth, height: merged.windowHeight },
  );

  return {
    ...merged,
    windowWidth: width,
    windowHeight: height,
  };
}

/**
 * One insertion path for the active page: the objects land together and the
 * selection follows the last of the group. `addObject` and `addObjects` differ
 * only in the size of the group, so a pairing can never half-insert.
 */
function insertObjects(
  state: Pick<AppState, 'document' | 'activePageId'>,
  objects: DocumentObject[],
): Partial<AppState> {
  if (objects.length === 0) return {};

  const page = findPage(state.document, state.activePageId);

  if (!page) return {};

  return {
    document: replacePage(state.document, addObjectsToPage(page, objects)),
    selectedObjectId: objects[objects.length - 1].id,
  };
}

export const useStore = create<AppState>((set, get) => ({
  source: {
    draftUrl: '',
    status: 'idle',
    active: null,
    pendingMode: null,
    pendingUrl: null,
    captureDelayMs: 3000,
    captureSelector: '',
    errorCode: null,
    errorMessage: null,
  },
  frame: defaultFrame,
  background: defaultBackground,
  export: {
    format: 'png',
    scale: 2,
  },
  appShell: (() => {
    const themePreference = getInitialThemePreference();
    return {
      themePreference,
    };
  })(),
  document: initialDocument,
  activePageId: initialDocument.pages[0].id,
  selectedObjectId: null,
  setDraftUrl: (value) =>
    set((state) => ({
      source: {
        ...state.source,
        draftUrl: value,
      },
    })),
  setCaptureDelay: (captureDelayMs) =>
    set((state) => ({
      source: {
        ...state.source,
        captureDelayMs,
      },
    })),
  setCaptureSelector: (captureSelector) =>
    set((state) => ({
      source: {
        ...state.source,
        captureSelector,
      },
    })),
  startSourceLoading: (mode, pendingUrl = null) =>
    set((state) => ({
      source: {
        ...state.source,
        status: 'loading',
        pendingMode: mode,
        pendingUrl,
        errorCode: null,
        errorMessage: null,
      },
    })),
  commitResolvedSource: (resolved) =>
    set((state) => {
      const isNewSource =
        state.source.active?.mode !== resolved.mode ||
        state.source.active?.sourceUrl !== resolved.sourceUrl;

      return {
        source: {
          ...state.source,
          status: 'ready',
          active: resolved,
          pendingMode: null,
          pendingUrl: null,
          draftUrl: resolved.sourceUrl ?? '',
          errorCode: null,
          errorMessage: null,
        },
        frame: {
          ...state.frame,
          windowTitle: resolved.title,
          fitMode: isNewSource && resolved.mode === 'website-url' ? 'cover' : state.frame.fitMode,
          imageZoom: isNewSource ? 100 : state.frame.imageZoom,
          imagePositionX: isNewSource ? 50 : state.frame.imagePositionX,
          imagePositionY: isNewSource ? 50 : state.frame.imagePositionY,
        },
      };
    }),
  failSourceLoading: (code, message) =>
    set((state) => ({
      source: {
        ...state.source,
        status: 'error',
        pendingMode: null,
        pendingUrl: null,
        errorCode: code,
        errorMessage: message,
      },
    })),
  clearSourceError: () =>
    set((state) => ({
      source: {
        ...state.source,
        status: state.source.active ? 'ready' : 'idle',
        errorCode: null,
        errorMessage: null,
      },
    })),
  setFrameFamily: (family) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        family,
        viewportPreset: family === 'device-frame' ? 'mobile' : state.frame.viewportPreset,
        desktopChromePreset: family === 'desktop-browser' ? state.frame.desktopChromePreset : 'minimal',
      }),
    })),
  setDesktopChromePreset: (preset) =>
    set((state) => ({
      frame: {
        ...state.frame,
        desktopChromePreset: preset,
      },
    })),
  setDevicePreset: (preset) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        devicePreset: preset,
        viewportPreset: preset === 'phone' ? 'mobile' : 'tablet',
      }),
    })),
  setOrientation: (orientation) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        orientation,
      }),
    })),
  setViewportPreset: (preset) =>
    set((state) => ({
      frame: withViewport(state.frame, {
        viewportPreset: preset,
      }),
    })),
  setCustomViewport: (dimension, value) =>
    set((state) => ({
      frame: {
        ...state.frame,
        viewportPreset: 'custom',
        [dimension === 'width' ? 'windowWidth' : 'windowHeight']: Math.max(200, Math.round(value || 0)),
      },
    })),
  updateFrame: (config) =>
    set((state) => ({
      frame: {
        ...state.frame,
        ...config,
      },
    })),
  updateBackground: (config) =>
    set((state) => ({
      background: {
        ...state.background,
        ...config,
      },
    })),
  updateExport: (config) =>
    set((state) => ({
      export: {
        ...state.export,
        ...config,
      },
    })),
  setThemePreference: (themePreference) =>
    set((state) => ({
      appShell: {
        ...state.appShell,
        themePreference,
      },
    })),
  setActivePage: (pageId) =>
    set((state) =>
      findPage(state.document, pageId)
        ? { activePageId: pageId, selectedObjectId: null }
        : {},
    ),
  addPage: () =>
    set((state) => {
      const result = addPageToDocument(state.document);

      return {
        document: result.document,
        activePageId: result.pageId,
        selectedObjectId: null,
      };
    }),
  addTemplatePage: (page) =>
    set((state) => {
      const result = addTemplatePageToDocument(state.document, page);

      return {
        document: result.document,
        activePageId: result.pageId,
        selectedObjectId: null,
      };
    }),
  duplicatePage: (pageId) =>
    set((state) => {
      if (!findPage(state.document, pageId)) return {};

      const result = duplicateDocumentPage(state.document, pageId);

      return {
        document: result.document,
        activePageId: result.pageId,
        selectedObjectId: null,
      };
    }),
  movePage: (pageId, direction) =>
    set((state) => ({ document: moveDocumentPage(state.document, pageId, direction) })),
  renamePage: (pageId, name) =>
    set((state) => ({ document: renameDocumentPage(state.document, pageId, name) })),
  resizePage: (pageId, format) =>
    set((state) => {
      const page = findPage(state.document, pageId);

      if (!page) return {};

      return { document: replacePage(state.document, resizePageToFormat(page, format)) };
    }),
  setPageBackground: (pageId, background) =>
    set((state) => {
      const page = findPage(state.document, pageId);

      if (!page) return {};

      const nextPage = setPageBackgroundInPage(page, background);

      // A value the document does not accept (or the same color again) leaves
      // the document reference alone: no write, no re-render.
      if (nextPage === page) return {};

      return { document: replacePage(state.document, nextPage) };
    }),
  setPageTransition: (pageId, transition) =>
    set((state) => {
      const page = findPage(state.document, pageId);

      if (!page) return {};

      const nextPage = setPageTransitionInPage(page, transition);

      // The same transition again (or "None" over "None") is not a write.
      if (nextPage === page) return {};

      return { document: replacePage(state.document, nextPage) };
    }),
  addObject: (object) => set((state) => insertObjects(state, [object])),
  addObjects: (objects) => set((state) => insertObjects(state, objects)),
  updateObject: (objectId, patch) =>
    set((state) => {
      const page = findPage(state.document, state.activePageId);

      if (!page) return {};

      const nextPage = updateObjectInPage(page, objectId, patch);

      // An unknown id or a rejected patch leaves the document alone: no write,
      // no re-render.
      if (nextPage === page) return {};

      return { document: replacePage(state.document, nextPage) };
    }),
  removeObject: (objectId) =>
    set((state) => {
      const page = findPage(state.document, state.activePageId);

      if (!page) return {};

      return {
        document: replacePage(state.document, removeObjectFromPage(page, objectId)),
        selectedObjectId: state.selectedObjectId === objectId ? null : state.selectedObjectId,
      };
    }),
  moveObjectZ: (objectId, direction) =>
    set((state) => {
      const page = findPage(state.document, state.activePageId);

      if (!page) return {};

      return { document: replacePage(state.document, moveObjectInPage(page, objectId, direction)) };
    }),
  duplicateObject: (objectId) =>
    set((state) => {
      const page = findPage(state.document, state.activePageId);

      if (!page) return {};

      const result = duplicateObjectInPage(page, objectId);

      // An unknown id is not a write: the document reference stays put.
      if (result.page === page) return {};

      return {
        document: replacePage(state.document, result.page),
        selectedObjectId: result.objectId,
      };
    }),
  replaceImageSource: (objectId, src) => {
    const state = get();
    const page = findPage(state.document, state.activePageId);

    if (!page) return { ok: false, code: 'unknown-object' };

    try {
      const nextPage = replaceImageSourceInPage(page, objectId, src);

      // Only a successful replacement writes; the selection is not touched, so
      // the object stays selected across the source swap.
      if (nextPage !== page) {
        set({ document: replacePage(state.document, nextPage) });
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof ImageReplaceError) {
        return { ok: false, code: error.code };
      }

      throw error;
    }
  },
  selectObject: (objectId) => set({ selectedObjectId: objectId }),
  upsertSourceImage: (src, name) =>
    set((state) => {
      const page = findPage(state.document, state.activePageId);

      if (!page) return {};

      // A capture already on the page is selected again instead of duplicated.
      const existing = page.objects.find(
        (object) => object.type === 'image' && object.src === src,
      );

      if (existing) return { selectedObjectId: existing.id };

      const object = createImageObject(src, {
        name: name.trim() || 'Source',
        x: page.width * 0.1,
        y: page.height * 0.12,
        width: page.width * 0.8,
        height: page.height * 0.6,
      });

      return insertObjects(state, [object]);
    }),
  animationPreview: null,
  requestAnimationPreview: (kind) =>
    set((state) => ({
      animationPreview: { kind, token: (state.animationPreview?.token ?? 0) + 1 },
    })),
  presenting: false,
  startPresenting: () => set({ presenting: true }),
  stopPresenting: () => set({ presenting: false }),
  githubRepo: null,
  setGithubRepo: (githubRepo) => set({ githubRepo }),
}));
