export type Locale = 'en-US' | 'pt-BR' | 'es';

// Type-only: the category/style key sets come from the vendored catalog, and
// `import type` is erased at build time — the manifest data never rides the
// i18n chunk.
import type { RuneiconCategory, RuneiconStyle } from '@/lib/runeicons/manifest';
// Type-only too: the animate key sets mirror the schema, so a new preset
// cannot land without its three labels.
import type {
  AnimationDirection,
  AnimationEasing,
  ElementAnimationPreset,
  PageTransitionPreset,
} from '@/lib/document';

interface ContentSection {
  title: string;
  body: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

export interface MessageSchema {
  brandName: string;
  nav: {
    home: string;
    about: string;
    openApp: string;
    menu: string;
    backToSite: string;
    controls: string;
    close: string;
    repository: string;
  };
  theme: {
    label: string;
    dark: string;
    light: string;
    colorSelector: string;
    current: string;
    toggleToDark: string;
    toggleToLight: string;
  };
  home: {
    title: string;
    subtitle: string;
  };
  about: {
    eyebrow: string;
    title: string;
    intro: string;
    workflowTitle: string;
    workflow: ContentSection[];
    featuresTitle: string;
    features: ContentSection[];
    developerTitle: string;
    developerBody: string;
    developerOpenSource: string;
    developerProjects: string;
    faq: {
      title: string;
      intro: string;
      questions: FaqItem[];
      limitationsTitle: string;
      limitationsIntro: string;
      limitations: FaqItem[];
    };
  };
  source: {
    label: string;
    pageUrlLabel: string;
    placeholder: string;
    submit: string;
    capturePage: string;
    loading: string;
    captureDelay: string;
    captureDelayHint: string;
    captureQuick: string;
    captureBalanced: string;
    captureComplete: string;
    captureSelector: string;
    captureSelectorPlaceholder: string;
    captureSelectorHint: string;
    upload: string;
    uploadHint: string;
    paste: string;
    pasteHint: string;
    helper: string;
    fallbackTitle: string;
    fallbackAction: string;
    genericError: string;
  };
  editor: {
    title: string;
    subtitle: string;
    noSource: string;
    noSourceHint: string;
    currentSource: string;
    openControls: string;
    closeControls: string;
    sourceKinds: {
      websiteUrl: string;
      imageUrl: string;
      upload: string;
      clipboardImage: string;
    };
    sections: {
      source: string;
      frame: string;
      background: string;
      export: string;
    };
    previewEmptyTag: string;
    previewEmptyTitle: string;
    previewEmptyBody: string;
  };
  canvas: {
    insert: string;
    addText: string;
    addShape: string;
    addImage: string;
    zoom: string;
    zoomIn: string;
    zoomOut: string;
    zoomFit: string;
    snap: string;
    layers: string;
    layersEmpty: string;
    addObject: string;
    duplicateObject: string;
    layerUp: string;
    layerDown: string;
    deleteObject: string;
    showObject: string;
    hideObject: string;
    lockObject: string;
    unlockObject: string;
    pages: string;
    addPage: string;
    duplicatePage: string;
    pageUp: string;
    pageDown: string;
    pageName: string;
    format: string;
    formatPoster: string;
    formatBanner: string;
    formatHero: string;
    exportFormat: string;
    exportQuality: string;
    exportPage: string;
    exporting: string;
    exportHint: string;
    exportError: string;
    exportFallbackToPng: string;
    selection: string;
    canvasLabel: string;
  };
  text: {
    headings: string;
    subheading: string;
    body: string;
    fontPairings: string;
    lists: string;
    bulletedList: string;
    numberedList: string;
    classic: string;
    modern: string;
    editorial: string;
    playful: string;
    poster: string;
    elegant: string;
    curved: string;
    arcUp: string;
    arcDown: string;
  };
  brand: {
    palette: string;
    paletteHint: string;
    addColor: string;
    removeColor: string;
    fonts: string;
    headingFont: string;
    bodyFont: string;
    applyFont: string;
    logo: string;
    uploadLogo: string;
    insertLogo: string;
    removeLogo: string;
    error: string;
  };
  shapes: {
    rectangle: string;
    ellipse: string;
    triangle: string;
    line: string;
    star: string;
    polygon: string;
  };
  templates: {
    socialPost: string;
    quoteCard: string;
    announcement: string;
    eventPoster: string;
    saleBanner: string;
    heroSlide: string;
    productCard: string;
    statsCard: string;
    storyPromo: string;
    newsletterHeader: string;
    readmeHero369: string;
    readmeHero430: string;
    readmeHero720: string;
    readmeHero840: string;
    readmeHero1200: string;
    readmeHeroFluid100: string;
    readmeHeroAnim760: string;
    readmeHeroAnim800: string;
    readmeHeroAnimFluid100: string;
    readmeDemo600: string;
    readmeDemoAnim23: string;
    readmeDemoAnim80: string;
    sponsorsTable: string;
    releaseGrade: string;
    profileHero640: string;
    profileHero400: string;
    profileHeroFluid100: string;
    sectionTitleIllustrated: string;
    partial: string;
    githubProject: string;
    githubRepo: string;
    githubRepoPlaceholder: string;
    githubFill: string;
    githubFilled: string;
    githubFallback: string;
    /** Collapsible gallery sections, one per seed family (the GitHub section reuses `githubProject`). */
    sectionOwn: string;
    sectionReadmeHeroes: string;
    sectionAnimated: string;
    sectionReadmeDemo: string;
    sectionSponsors: string;
    sectionRelease: string;
    sectionProfile: string;
    sectionTitles: string;
  };
  stickers: {
    tab: string;
    badgeNew: string;
    saleTag: string;
    speechBubble: string;
    starRating: string;
    checkBadge: string;
    arrowRight: string;
    heart: string;
    sparkles: string;
    quoteMark: string;
    dotGrid: string;
  };
  icons: {
    tab: string;
    workspace: string;
    search: string;
    category: string;
    allCategories: string;
    style: string;
    showMore: string;
    properties: string;
    colorMode: string;
    solid: string;
    gradient: string;
    start: string;
    end: string;
    primary: string;
    secondary: string;
    designed: string;
    insert: string;
    insertHint: string;
    empty: string;
    error: string;
    styles: Record<RuneiconStyle, string>;
    categories: Record<RuneiconCategory, string>;
  };
  inspector: {
    name: string;
    position: string;
    size: string;
    width: string;
    height: string;
    rotation: string;
    opacity: string;
    typography: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    align: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    appearance: string;
    paint: string;
    fill: string;
    stroke: string;
    strokeWidth: string;
    cornerRadius: string;
    sides: string;
    innerRadius: string;
    length: string;
    image: string;
    fit: string;
    mask: string;
    maskRounded: string;
    maskNone: string;
    locked: string;
    curve: string;
    curveText: string;
    arcDirection: string;
    arcAmount: string;
    straighten: string;
  };
  animate: {
    element: string;
    elementHint: string;
    noSelection: string;
    remove: string;
    page: string;
    pageHint: string;
    duration: string;
    easing: string;
    direction: string;
    preview: string;
    previewPage: string;
    present: string;
    none: string;
    presets: Record<ElementAnimationPreset, string>;
    transitions: Record<PageTransitionPreset, string>;
    easings: Record<AnimationEasing, string>;
    directions: Record<AnimationDirection, string>;
  };
  };
  controls: {
    frameFamily: string;
    desktop: string;
    mobileTablet: string;
    chromePreset: string;
    darkChrome: string;
    showTitle: string;
    devicePreset: string;
    orientation: string;
    portrait: string;
    landscape: string;
    showCamera: string;
    viewportPreset: string;
    width: string;
    height: string;
    imageFit: string;
    fitContain: string;
    fitCover: string;
    imageFraming: string;
    imageFramingHint: string;
    imageZoom: string;
    imagePositionX: string;
    imagePositionY: string;
    resetFraming: string;
    dragPreview: string;
    shadow: string;
    cornerRadius: string;
    windowTitle: string;
    backgroundType: string;
    solid: string;
    gradient: string;
    image: string;
    palette: string;
    gradientPresets: string;
    type: string;
    angle: string;
    start: string;
    end: string;
    backgroundImageUrl: string;
    backgroundImagePlaceholder: string;
    canvasPadding: string;
    format: string;
    scale: string;
    exportButton: string;
    exportHint: string;
  };
  footer: {
    language: string;
    lastCommit: string;
    repository: string;
  };
}

export const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: 'en-US', label: 'EN' },
  { value: 'pt-BR', label: 'PT' },
  { value: 'es', label: 'ES' },
];

export const messages: Record<Locale, MessageSchema> = {
  'en-US': {
    brandName: 'Fremit',
    nav: {
      home: 'Home',
      about: 'About',
      openApp: 'Open app',
      menu: 'Menu',
      backToSite: 'Back to site',
      controls: 'Controls',
      close: 'Close',
      repository: 'Repository',
    },
    theme: {
      label: 'Theme',
      dark: 'Dark',
      light: 'Light',
      colorSelector: 'Color selector',
      current: 'Current theme',
      toggleToDark: 'Switch to dark theme',
      toggleToLight: 'Switch to light theme',
    },
    home: {
      title: 'Paste, edit, and export.',
      subtitle: 'A link, an image, or a screenshot. Adjust the frame and export.',
    },
    about: {
      eyebrow: 'About',
      title: 'How to use Fremit.',
      intro: 'Fremit turns a link, screenshot, or image into a framed asset you can export quickly.',
      workflowTitle: 'How it works',
      workflow: [
        {
          title: 'Bring the source',
          body: 'Paste a website URL, use a direct image URL, upload a screenshot, or paste one from the clipboard.',
        },
        {
          title: 'Pick the frame',
          body: 'Switch between browser, phone, tablet, portrait, landscape, or a custom viewport.',
        },
        {
          title: 'Adjust and export',
          body: 'Refine the background, scale, and window details, then export the current canvas as PNG or JPG.',
        },
      ],
      featuresTitle: 'What you can adjust',
      features: [
        {
          title: 'Browser presets',
          body: 'macOS, Windows, minimal browser, or no chrome at all.',
        },
        {
          title: 'Phone and tablet frames',
          body: 'Generic mobile and tablet shells with portrait and landscape orientation.',
        },
        {
          title: 'Dynamic page capture',
          body: 'Wait for asynchronous content, choose a public route, or focus a specific section before framing it.',
        },
        {
          title: 'Background and export',
          body: 'Solid, gradient, or image backgrounds plus export scale control.',
        },
      ],
      developerTitle: 'About mafhper',
      developerBody: 'I believe in a free web, enriched by applications made with care. Simple tools that solve real problems.',
      developerOpenSource:
        'All of my projects are open source. You can explore the code, contribute, fork them, or simply learn from them. The web should belong to everyone.',
      developerProjects: 'See other projects',
      faq: {
        title: 'Frequently asked questions.',
        intro: 'Short answers about use, export, and the limits of URL mode.',
        questions: [
          {
            question: 'Why does a link fail sometimes?',
            answer: 'URL mode relies on what the target site exposes. Some sites simply do not provide a usable preview.',
          },
          {
            question: 'When should I use a manual screenshot?',
            answer: 'Use a screenshot for private pages, apps behind login, dynamic views, or when the URL preview does not match.',
          },
          {
            question: 'Can I export phone and tablet mockups?',
            answer: 'Yes. The editor includes generic phone and tablet frames with portrait and landscape orientation.',
          },
          {
            question: 'What can I export?',
            answer: 'The current canvas can be exported as PNG or JPG at your chosen scale.',
          },
        ],
        limitationsTitle: 'Limitations of URL mode',
        limitationsIntro: 'These points define the real boundary of URL capture in Fremit.',
        limitations: [
          {
            question: 'Do private or authenticated pages work?',
            answer: 'No. URL mode cannot access private sessions or authenticated content.',
          },
          {
            question: 'Do single-page apps always resolve correctly?',
            answer: 'Not always. Fremit can wait for dynamic content and focus a CSS-selected section, but it cannot reproduce login or interaction-only states.',
          },
          {
            question: 'Will a failed link erase my current canvas?',
            answer: 'No. A failed URL keeps your last working composition and prompts for a screenshot.',
          },
        ],
      },
    },
    source: {
      label: 'Enter a link',
      pageUrlLabel: 'Page to capture',
      placeholder: 'Paste a website or image URL...',
      submit: 'Open in Editor',
      capturePage: 'Capture page',
      loading: 'Loading...',
      captureDelay: 'Wait for the page',
      captureDelayHint: 'Gives dynamic content time to finish rendering.',
      captureQuick: 'Quick · 1 second',
      captureBalanced: 'Balanced · 3 seconds',
      captureComplete: 'Complex page · 5 seconds',
      captureSelector: 'Focus section (optional)',
      captureSelectorPlaceholder: 'Example: main or #hero',
      captureSelectorHint: 'Waits for this CSS selector and captures only that section.',
      upload: 'Upload image',
      uploadHint: 'or drop it here',
      paste: 'Paste',
      pasteHint: 'Use what is in the clipboard',
      helper: 'Paste a link or drop an image to start.',
      fallbackTitle: 'Use a screenshot instead',
      fallbackAction: 'The current composition stays intact.',
      genericError: 'The source could not be loaded. Try again or use a screenshot.',
    },
    editor: {
      title: 'App',
      subtitle: 'Adjust and export.',
      noSource: 'No source loaded yet',
      noSourceHint: 'Paste a link, upload a screenshot, or use the clipboard.',
      currentSource: 'Current source',
      openControls: 'Controls',
      closeControls: 'Close controls',
      sourceKinds: {
        websiteUrl: 'Website URL',
        imageUrl: 'Image URL',
        upload: 'Uploaded image',
        clipboardImage: 'Pasted image',
      },
      sections: {
        source: 'Source',
        frame: 'Frame',
        background: 'Background',
        export: 'Export',
      },
      previewEmptyTag: 'Ready',
      previewEmptyTitle: 'Drop a screenshot or paste a link.',
      previewEmptyBody: 'The canvas scales to the viewport while keeping the export ready.',
    },
    canvas: {
      insert: 'Insert',
      addText: 'Add text',
      addShape: 'Add shape',
      addImage: 'Add image',
      zoom: 'Zoom',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomFit: 'Fit page',
      snap: 'Snap to guides',
      layers: 'Layers',
      layersEmpty: 'No objects on this page yet.',
      addObject: 'Add object',
      duplicateObject: 'Duplicate object',
      layerUp: 'Move layer up',
      layerDown: 'Move layer down',
      deleteObject: 'Delete object',
      showObject: 'Show object',
      hideObject: 'Hide object',
      lockObject: 'Lock object',
      unlockObject: 'Unlock object',
      pages: 'Pages',
      addPage: 'Add page',
      duplicatePage: 'Duplicate page',
      pageUp: 'Move page up',
      pageDown: 'Move page down',
      pageName: 'Page name',
      format: 'Format',
      formatPoster: 'Poster',
      formatBanner: 'Banner',
      formatHero: 'Hero',
      exportFormat: 'Export format',
      exportQuality: 'Export quality',
      exportPage: 'Export page',
      exporting: 'Exporting...',
      exportHint: 'Renders the active page from the document.',
      exportError: 'Export failed. Try again.',
      exportFallbackToPng: 'Browser without WebP — PNG delivered.',
      selection: 'Selection',
      canvasLabel: 'Canvas workspace',
    },
    text: {
      headings: 'Headings',
      subheading: 'Subheading',
      body: 'Body',
      fontPairings: 'Font pairings',
      lists: 'Lists',
      bulletedList: 'Bulleted list',
      numberedList: 'Numbered list',
      classic: 'Classic',
      modern: 'Modern',
      editorial: 'Editorial',
      playful: 'Playful',
      poster: 'Poster',
      elegant: 'Elegant',
      curved: 'Curved',
      arcUp: 'Arc up',
      arcDown: 'Arc down',
    },
    brand: {
      palette: 'Palette',
      paletteHint: 'Click a color to fill the selection; with nothing selected it fills the page.',
      addColor: 'Add color',
      removeColor: 'Remove color',
      fonts: 'Fonts',
      headingFont: 'Heading',
      bodyFont: 'Body',
      applyFont: 'Apply to selected text',
      logo: 'Logo',
      uploadLogo: 'Upload logo',
      insertLogo: 'Insert on page',
      removeLogo: 'Remove logo',
      error: 'The logo could not be added.',
    },
    shapes: {
      rectangle: 'Rectangle',
      ellipse: 'Ellipse',
      triangle: 'Triangle',
      line: 'Line',
      star: 'Star',
      polygon: 'Polygon',
    },
    templates: {
      socialPost: 'Social post',
      quoteCard: 'Quote card',
      announcement: 'Announcement',
      eventPoster: 'Event poster',
      saleBanner: 'Sale banner',
      heroSlide: 'Hero slide',
      productCard: 'Product card',
      statsCard: 'Stats card',
      storyPromo: 'Story promo',
      newsletterHeader: 'Newsletter header',
      readmeHero369: 'README hero 369',
      readmeHero430: 'README hero 430',
      readmeHero720: 'README hero 720',
      readmeHero840: 'README hero 840',
      readmeHero1200: 'README hero 1200',
      readmeHeroFluid100: 'README hero 100%',
      readmeHeroAnim760: 'README hero anim 760',
      readmeHeroAnim800: 'README hero anim 800',
      readmeHeroAnimFluid100: 'README hero anim 100%',
      readmeDemo600: 'README demo 600',
      readmeDemoAnim23: 'README demo anim 23%',
      readmeDemoAnim80: 'README demo anim 80%',
      sponsorsTable: 'Sponsors table',
      releaseGrade: 'Release notes',
      profileHero640: 'Profile hero 640',
      profileHero400: 'Profile hero 400',
      profileHeroFluid100: 'Profile hero 100%',
      sectionTitleIllustrated: 'Section title (illustrated)',
      partial: 'Partial',
      githubProject: 'GitHub project',
      githubRepo: 'Repository',
      githubRepoPlaceholder: 'owner/repo',
      githubFill: 'Use repo data',
      githubFilled: 'Repository loaded.',
      githubFallback: 'GitHub is unreachable — placeholders kept.',
      sectionOwn: 'Own starters',
      sectionReadmeHeroes: 'README heroes',
      sectionAnimated: 'Animated',
      sectionReadmeDemo: 'README demo',
      sectionSponsors: 'Sponsors',
      sectionRelease: 'Release notes',
      sectionProfile: 'Profile heroes',
      sectionTitles: 'Section titles',
    },
    stickers: {
      tab: 'Stickers',
      badgeNew: 'NEW badge',
      saleTag: 'Sale tag',
      speechBubble: 'Speech bubble',
      starRating: 'Star rating',
      checkBadge: 'Check badge',
      arrowRight: 'Arrow',
      heart: 'Heart',
      sparkles: 'Sparkles',
      quoteMark: 'Quote mark',
      dotGrid: 'Dot grid',
    },
    icons: {
      tab: 'Icons',
      workspace: 'Content',
      search: 'Search icons',
      category: 'Category',
      allCategories: 'All categories',
      style: 'Style',
      showMore: 'Show more',
      properties: 'Properties',
      colorMode: 'Color mode',
      solid: 'Solid',
      gradient: 'Gradient',
      start: 'Start',
      end: 'End',
      primary: 'Primary',
      secondary: 'Secondary',
      designed: 'This style keeps its designed colors.',
      insert: 'Insert icon',
      insertHint: 'Insert the icon again to change its colors.',
      empty: 'No icons match.',
      error: 'The icon could not be loaded.',
      styles: {
        normal: 'Outline',
        duotone: 'Duotone',
        fill: 'Fill',
        pixelated: 'Pixelated',
        glass: 'Glass',
      },
      categories: {
        accessibility: 'Accessibility',
        action: 'Actions',
        commerce: 'Commerce',
        communication: 'Communication',
        dev: 'Development',
        feedback: 'Feedback',
        files: 'Files',
        hardware: 'Hardware',
        layout: 'Layout',
        media: 'Media',
        metrics: 'Metrics',
        misc: 'Misc',
        navigation: 'Navigation',
        time: 'Time',
        users: 'People',
        weather: 'Weather',
      },
    },
    inspector: {
      name: 'Layer name',
      position: 'Position',
      size: 'Size',
      width: 'Width',
      height: 'Height',
      rotation: 'Rotation',
      opacity: 'Opacity',
      typography: 'Typography',
      fontFamily: 'Font',
      fontSize: 'Font size',
      fontWeight: 'Weight',
      align: 'Alignment',
      alignLeft: 'Align left',
      alignCenter: 'Align center',
      alignRight: 'Align right',
      appearance: 'Appearance',
      paint: 'Paint',
      fill: 'Fill',
      stroke: 'Stroke',
      strokeWidth: 'Stroke width',
      cornerRadius: 'Corner radius',
      sides: 'Sides',
      innerRadius: 'Inner radius (%)',
      length: 'Length',
      image: 'Image',
      fit: 'Fit',
      mask: 'Mask',
      maskRounded: 'Rounded corners',
      maskNone: 'None',
      locked: 'Locked — unlock to edit.',
      curve: 'Curve',
      curveText: 'Curve text',
      arcDirection: 'Direction',
      arcAmount: 'Curvature',
      straighten: 'Straighten',
    },
    animate: {
      element: 'Element',
      elementHint: 'Select an object, then pick its entrance.',
      noSelection: 'Select an object on the canvas to animate it.',
      remove: 'Remove animation',
      page: 'Page',
      pageHint: 'Plays the transition and every animated layer.',
      duration: 'Duration (ms)',
      easing: 'Easing',
      direction: 'Direction',
      preview: 'Preview',
      previewPage: 'Preview page',
      present: 'Present',
      none: 'None',
      presets: {
        fade: 'Fade',
        rise: 'Rise',
        pop: 'Pop',
        slide: 'Slide',
        words: 'Words',
        typewriter: 'Typewriter',
        wipe: 'Wipe',
        focus: 'Focus',
      },
      transitions: {
        fade: 'Fade',
        dip: 'Dip',
        dissolve: 'Dissolve',
        blur: 'Blur',
        slide: 'Slide',
        push: 'Push',
        cover: 'Cover',
        uncover: 'Uncover',
        zoom: 'Zoom',
        wipe: 'Wipe',
        circle: 'Circle',
        flip: 'Flip',
        spin: 'Spin',
        blinds: 'Blinds',
      },
      easings: {
        linear: 'Linear',
        easeOut: 'Ease out',
        easeInOut: 'Ease in and out',
        backOut: 'Overshoot',
      },
      directions: {
        up: 'Up',
        down: 'Down',
        left: 'Left',
        right: 'Right',
      },
    },
    },
    controls: {
      frameFamily: 'Frame family',
      desktop: 'Desktop',
      mobileTablet: 'Phone / Tablet',
      chromePreset: 'Browser preset',
      darkChrome: 'Dark chrome',
      showTitle: 'Show title',
      devicePreset: 'Device preset',
      orientation: 'Orientation',
      portrait: 'Portrait',
      landscape: 'Landscape',
      showCamera: 'Show camera area',
      viewportPreset: 'Viewport preset',
      width: 'Width',
      height: 'Height',
      imageFit: 'Image fit',
      fitContain: 'Show entire image',
      fitCover: 'Fill the frame',
      imageFraming: 'Framing',
      imageFramingHint: 'Drag the preview or adjust the focus precisely.',
      imageZoom: 'Zoom',
      imagePositionX: 'Horizontal focus',
      imagePositionY: 'Vertical focus',
      resetFraming: 'Reset framing',
      dragPreview: 'Preview image. Drag to reposition; use arrow keys for precise focus.',
      shadow: 'Shadow',
      cornerRadius: 'Corner radius',
      windowTitle: 'Window title',
      backgroundType: 'Background type',
      solid: 'Solid',
      gradient: 'Gradient',
      image: 'Image',
      palette: 'Palette',
      gradientPresets: 'Gradient presets',
      type: 'Type',
      angle: 'Angle',
      start: 'Start',
      end: 'End',
      backgroundImageUrl: 'Background image URL',
      backgroundImagePlaceholder: 'Paste an image URL for the background',
      canvasPadding: 'Canvas padding',
      format: 'Format',
      scale: 'Scale',
      exportButton: 'Export image',
      exportHint: 'Export the current canvas as shown.',
    },
    footer: {
      language: 'Language',
      lastCommit: 'Last commit',
      repository: 'Repository',
    },
  },
  'pt-BR': {
    brandName: 'Fremit',
    nav: {
      home: 'Início',
      about: 'Sobre',
      openApp: 'Abrir app',
      menu: 'Menu',
      backToSite: 'Voltar ao site',
      controls: 'Controles',
      close: 'Fechar',
      repository: 'Repositório',
    },
    theme: {
      label: 'Tema',
      dark: 'Escuro',
      light: 'Claro',
      colorSelector: 'Seletor de cores',
      current: 'Tema atual',
      toggleToDark: 'Mudar para o tema escuro',
      toggleToLight: 'Mudar para o tema claro',
    },
    home: {
      title: 'Cole, edite e exporte.',
      subtitle: 'Um link, uma imagem ou uma captura. Ajuste a moldura e exporte.',
    },
    about: {
      eyebrow: 'Sobre',
      title: 'Como usar o Fremit.',
      intro: 'O Fremit transforma um link, screenshot ou imagem em um mockup pronto para exportar.',
      workflowTitle: 'Como funciona',
      workflow: [
        {
          title: 'Traga a fonte',
          body: 'Cole uma URL de site, use uma URL direta de imagem, envie um screenshot ou cole direto da área de transferência.',
        },
        {
          title: 'Escolha a moldura',
          body: 'Troque entre navegador, phone, tablet, portrait, landscape ou um viewport customizado.',
        },
        {
          title: 'Ajuste e exporte',
          body: 'Refine o fundo, a escala e os detalhes da janela, depois exporte o canvas atual em PNG ou JPG.',
        },
      ],
      featuresTitle: 'O que você pode ajustar',
      features: [
        {
          title: 'Presets de navegador',
          body: 'macOS, Windows, navegador minimalista ou sem chrome.',
        },
        {
          title: 'Molduras de phone e tablet',
          body: 'Shells genéricos de mobile e tablet com portrait e landscape.',
        },
        {
          title: 'Captura de páginas dinâmicas',
          body: 'Aguarde conteúdo assíncrono, escolha uma rota pública ou foque uma seção específica antes de aplicar a moldura.',
        },
        {
          title: 'Fundo e exportação',
          body: 'Fundos sólidos, gradientes ou imagem com controle de escala na exportação.',
        },
      ],
      developerTitle: 'Sobre mafhper',
      developerBody:
        'Acredito em uma web livre, enriquecida com aplicações feitas com carinho. Ferramentas simples que resolvem problemas reais.',
      developerOpenSource:
        'Todos os meus projetos são open source. Você pode explorar o código, contribuir, fazer fork, ou simplesmente aprender. A web deve ser de todos.',
      developerProjects: 'Ver outros projetos',
      faq: {
        title: 'Perguntas frequentes.',
        intro: 'Respostas curtas sobre uso, exportação e os limites do modo URL.',
        questions: [
          {
            question: 'Por que um link falha às vezes?',
            answer: 'O modo URL depende do que o site de destino expõe. Alguns sites simplesmente não fornecem um preview utilizable.',
          },
          {
            question: 'Quando devo usar um screenshot manual?',
            answer: 'Use screenshot em páginas privadas, apps com login, views dinâmicas ou quando o preview da URL não bater.',
          },
          {
            question: 'Consigo exportar mockups de phone e tablet?',
            answer: 'Sim. O editor inclui molduras genéricas de phone e tablet com orientação portrait e landscape.',
          },
          {
            question: 'O que posso exportar?',
            answer: 'O canvas atual pode ser exportado em PNG ou JPG na escala escolhida.',
          },
        ],
        limitationsTitle: 'Limitações do modo URL',
        limitationsIntro: 'Esses pontos definem o limite real da captura por URL dentro do Fremit.',
        limitations: [
          {
            question: 'Páginas privadas ou autenticadas funcionam?',
            answer: 'Não. O modo URL não acessa sessões privadas nem conteúdo autenticado.',
          },
          {
            question: 'Apps SPA sempre resolvem corretamente?',
            answer: 'Nem sempre. O Fremit pode aguardar conteúdo dinâmico e focar uma seção por seletor CSS, mas não reproduz login ou estados que exigem interação.',
          },
          {
            question: 'Um link com falha apaga meu canvas atual?',
            answer: 'Não. Uma URL com falha mantém sua última composição e pede um screenshot.',
          },
        ],
      },
    },
    source: {
      label: 'Insira um link',
      pageUrlLabel: 'Página a capturar',
      placeholder: 'Cole a URL de um site ou imagem...',
      submit: 'Abrir no Editor',
      capturePage: 'Capturar página',
      loading: 'Carregando...',
      captureDelay: 'Aguardar a página',
      captureDelayHint: 'Dá tempo para o conteúdo dinâmico terminar de renderizar.',
      captureQuick: 'Rápida · 1 segundo',
      captureBalanced: 'Equilibrada · 3 segundos',
      captureComplete: 'Página complexa · 5 segundos',
      captureSelector: 'Seção em foco (opcional)',
      captureSelectorPlaceholder: 'Exemplo: main ou #hero',
      captureSelectorHint: 'Aguarda este seletor CSS e captura somente essa seção.',
      upload: 'Enviar imagem',
      uploadHint: 'ou arraste para cá',
      paste: 'Colar',
      pasteHint: 'Use o que está na área de transferência',
      helper: 'Cole um link ou arraste uma imagem para começar.',
      fallbackTitle: 'Use um screenshot',
      fallbackAction: 'A composição atual continua intacta.',
      genericError: 'A fonte não pôde ser carregada. Tente de novo ou use um screenshot.',
    },
    editor: {
      title: 'Editor',
      subtitle: 'Ajuste e exporte.',
      noSource: 'Nenhuma fonte carregada',
      noSourceHint: 'Cole um link, envie um screenshot ou use a área de transferência.',
      currentSource: 'Fonte atual',
      openControls: 'Controles',
      closeControls: 'Fechar controles',
      sourceKinds: {
        websiteUrl: 'URL do site',
        imageUrl: 'URL da imagem',
        upload: 'Imagem enviada',
        clipboardImage: 'Imagem colada',
      },
      sections: {
        source: 'Fonte',
        frame: 'Moldura',
        background: 'Fundo',
        export: 'Exportar',
      },
      previewEmptyTag: 'Pronto',
      previewEmptyTitle: 'Solte um screenshot ou cole um link.',
      previewEmptyBody: 'O canvas escala para o viewport e mantém a exportação pronta.',
    },
    canvas: {
      insert: 'Inserir',
      addText: 'Adicionar texto',
      addShape: 'Adicionar forma',
      addImage: 'Adicionar imagem',
      zoom: 'Zoom',
      zoomIn: 'Aumentar zoom',
      zoomOut: 'Diminuir zoom',
      zoomFit: 'Ajustar à página',
      snap: 'Encaixar nas guias',
      layers: 'Camadas',
      layersEmpty: 'Nenhum objeto nesta página ainda.',
      addObject: 'Adicionar objeto',
      duplicateObject: 'Duplicar objeto',
      layerUp: 'Mover camada para cima',
      layerDown: 'Mover camada para baixo',
      deleteObject: 'Excluir objeto',
      showObject: 'Mostrar objeto',
      hideObject: 'Ocultar objeto',
      lockObject: 'Travar objeto',
      unlockObject: 'Destravar objeto',
      pages: 'Páginas',
      addPage: 'Adicionar página',
      duplicatePage: 'Duplicar página',
      pageUp: 'Mover página para cima',
      pageDown: 'Mover página para baixo',
      pageName: 'Nome da página',
      format: 'Formato',
      formatPoster: 'Pôster',
      formatBanner: 'Banner',
      formatHero: 'Hero',
      exportFormat: 'Formato do arquivo',
      exportQuality: 'Qualidade da exportação',
      exportPage: 'Exportar página',
      exporting: 'Exportando...',
      exportHint: 'Renderiza a página ativa a partir do documento.',
      exportError: 'A exportação falhou. Tente de novo.',
      exportFallbackToPng: 'Navegador sem WebP — PNG entregue.',
      selection: 'Seleção',
      canvasLabel: 'Área de trabalho do canvas',
    },
    text: {
      headings: 'Títulos',
      subheading: 'Subtítulo',
      body: 'Corpo',
      fontPairings: 'Pares de fontes',
      lists: 'Listas',
      bulletedList: 'Lista com marcadores',
      numberedList: 'Lista numerada',
      classic: 'Clássico',
      modern: 'Moderno',
      editorial: 'Editorial',
      playful: 'Divertido',
      poster: 'Pôster',
      elegant: 'Elegante',
      curved: 'Curvado',
      arcUp: 'Arco para cima',
      arcDown: 'Arco para baixo',
    },
    brand: {
      palette: 'Paleta',
      paletteHint: 'Clique numa cor para preencher a seleção; sem seleção, preenche a página.',
      addColor: 'Adicionar cor',
      removeColor: 'Remover cor',
      fonts: 'Fontes',
      headingFont: 'Título',
      bodyFont: 'Corpo',
      applyFont: 'Aplicar ao texto selecionado',
      logo: 'Logo',
      uploadLogo: 'Enviar logo',
      insertLogo: 'Inserir na página',
      removeLogo: 'Remover logo',
      error: 'O logo não pôde ser adicionado.',
    },
    shapes: {
      rectangle: 'Retângulo',
      ellipse: 'Elipse',
      triangle: 'Triângulo',
      line: 'Linha',
      star: 'Estrela',
      polygon: 'Polígono',
    },
    templates: {
      socialPost: 'Post social',
      quoteCard: 'Cartão de citação',
      announcement: 'Anúncio',
      eventPoster: 'Cartaz de evento',
      saleBanner: 'Banner de promoção',
      heroSlide: 'Slide de destaque',
      productCard: 'Cartão de produto',
      statsCard: 'Cartão de números',
      storyPromo: 'Story de promoção',
      newsletterHeader: 'Cabeçalho de newsletter',
      readmeHero369: 'Hero de README 369',
      readmeHero430: 'Hero de README 430',
      readmeHero720: 'Hero de README 720',
      readmeHero840: 'Hero de README 840',
      readmeHero1200: 'Hero de README 1200',
      readmeHeroFluid100: 'Hero de README 100%',
      readmeHeroAnim760: 'Hero de README anim 760',
      readmeHeroAnim800: 'Hero de README anim 800',
      readmeHeroAnimFluid100: 'Hero de README anim 100%',
      readmeDemo600: 'Demo de README 600',
      readmeDemoAnim23: 'Demo de README anim 23%',
      readmeDemoAnim80: 'Demo de README anim 80%',
      sponsorsTable: 'Tabela de patrocinadores',
      releaseGrade: 'Notas de versão',
      profileHero640: 'Hero de perfil 640',
      profileHero400: 'Hero de perfil 400',
      profileHeroFluid100: 'Hero de perfil 100%',
      sectionTitleIllustrated: 'Título de seção (ilustrado)',
      partial: 'Parcial',
      githubProject: 'Projeto do GitHub',
      githubRepo: 'Repositório',
      githubRepoPlaceholder: 'usuario/repositorio',
      githubFill: 'Usar dados do repositório',
      githubFilled: 'Repositório carregado.',
      githubFallback: 'GitHub inacessível — placeholders mantidos.',
      sectionOwn: 'Designs próprios',
      sectionReadmeHeroes: 'Heros de README',
      sectionAnimated: 'Animados',
      sectionReadmeDemo: 'Demo de README',
      sectionSponsors: 'Patrocinadores',
      sectionRelease: 'Notas de versão',
      sectionProfile: 'Heros de perfil',
      sectionTitles: 'Títulos de seção',
    },
    stickers: {
      tab: 'Stickers',
      badgeNew: 'Selo NOVO',
      saleTag: 'Etiqueta de promoção',
      speechBubble: 'Balão de fala',
      starRating: 'Avaliação em estrelas',
      checkBadge: 'Selo de confirmação',
      arrowRight: 'Seta',
      heart: 'Coração',
      sparkles: 'Brilhos',
      quoteMark: 'Aspas',
      dotGrid: 'Grade de pontos',
    },
    icons: {
      tab: 'Ícones',
      workspace: 'Conteúdo',
      search: 'Buscar ícones',
      category: 'Categoria',
      allCategories: 'Todas as categorias',
      style: 'Estilo',
      showMore: 'Mostrar mais',
      properties: 'Propriedades',
      colorMode: 'Modo de cor',
      solid: 'Sólida',
      gradient: 'Gradiente',
      start: 'Início',
      end: 'Fim',
      primary: 'Primária',
      secondary: 'Secundária',
      designed: 'Este estilo mantém as cores originais.',
      insert: 'Inserir ícone',
      insertHint: 'Insira o ícone novamente para mudar as cores.',
      empty: 'Nenhum ícone corresponde.',
      error: 'Não foi possível carregar o ícone.',
      styles: {
        normal: 'Contorno',
        duotone: 'Duotone',
        fill: 'Preenchido',
        pixelated: 'Pixelado',
        glass: 'Vidro',
      },
      categories: {
        accessibility: 'Acessibilidade',
        action: 'Ações',
        commerce: 'Comércio',
        communication: 'Comunicação',
        dev: 'Desenvolvimento',
        feedback: 'Feedback',
        files: 'Arquivos',
        hardware: 'Hardware',
        layout: 'Layout',
        media: 'Mídia',
        metrics: 'Métricas',
        misc: 'Diversos',
        navigation: 'Navegação',
        time: 'Tempo',
        users: 'Pessoas',
        weather: 'Clima',
      },
    },
    inspector: {
      name: 'Nome da camada',
      position: 'Posição',
      size: 'Tamanho',
      width: 'Largura',
      height: 'Altura',
      rotation: 'Rotação',
      opacity: 'Opacidade',
      typography: 'Tipografia',
      fontFamily: 'Fonte',
      fontSize: 'Tamanho da fonte',
      fontWeight: 'Peso',
      align: 'Alinhamento',
      alignLeft: 'Alinhar à esquerda',
      alignCenter: 'Centralizar',
      alignRight: 'Alinhar à direita',
      appearance: 'Aparência',
      paint: 'Pintura',
      fill: 'Preenchimento',
      stroke: 'Contorno',
      strokeWidth: 'Espessura do contorno',
      cornerRadius: 'Raio dos cantos',
      sides: 'Lados',
      innerRadius: 'Raio interno (%)',
      length: 'Comprimento',
      image: 'Imagem',
      fit: 'Ajuste',
      mask: 'Máscara',
      maskRounded: 'Cantos arredondados',
      maskNone: 'Nenhuma',
      locked: 'Travado — destrave para editar.',
      curve: 'Curva',
      curveText: 'Curvar texto',
      arcDirection: 'Direção',
      arcAmount: 'Curvatura',
      straighten: 'Endireitar',
    },
    animate: {
      element: 'Elemento',
      elementHint: 'Selecione um objeto e escolha a entrada.',
      noSelection: 'Selecione um objeto no canvas para animá-lo.',
      remove: 'Remover animação',
      page: 'Página',
      pageHint: 'Reproduz a transição e cada camada animada.',
      duration: 'Duração (ms)',
      easing: 'Curva',
      direction: 'Direção',
      preview: 'Pré-visualizar',
      previewPage: 'Pré-visualizar página',
      present: 'Apresentar',
      none: 'Nenhuma',
      presets: {
        fade: 'Fade',
        rise: 'Subida',
        pop: 'Pop',
        slide: 'Deslizar',
        words: 'Palavras',
        typewriter: 'Máquina de escrever',
        wipe: 'Varredura',
        focus: 'Foco',
      },
      transitions: {
        fade: 'Fade',
        dip: 'Escurecer',
        dissolve: 'Dissolver',
        blur: 'Desfoque',
        slide: 'Deslizar',
        push: 'Empurrar',
        cover: 'Cobrir',
        uncover: 'Revelar',
        zoom: 'Zoom',
        wipe: 'Varredura',
        circle: 'Círculo',
        flip: 'Virar',
        spin: 'Girar',
        blinds: 'Persianas',
      },
      easings: {
        linear: 'Linear',
        easeOut: 'Saída suave',
        easeInOut: 'Suave nas pontas',
        backOut: 'Com ultrapassagem',
      },
      directions: {
        up: 'Para cima',
        down: 'Para baixo',
        left: 'Esquerda',
        right: 'Direita',
      },
    },
    },
    controls: {
      frameFamily: 'Família da moldura',
      desktop: 'Desktop',
      mobileTablet: 'Phone / Tablet',
      chromePreset: 'Preset de navegador',
      darkChrome: 'Chrome escuro',
      showTitle: 'Mostrar título',
      devicePreset: 'Preset do device',
      orientation: 'Orientação',
      portrait: 'Portrait',
      landscape: 'Landscape',
      showCamera: 'Mostrar área da câmera',
      viewportPreset: 'Preset de viewport',
      width: 'Largura',
      height: 'Altura',
      imageFit: 'Ajuste da imagem',
      fitContain: 'Mostrar imagem inteira',
      fitCover: 'Preencher a moldura',
      imageFraming: 'Enquadramento',
      imageFramingHint: 'Arraste a prévia ou ajuste o foco com precisão.',
      imageZoom: 'Zoom',
      imagePositionX: 'Foco horizontal',
      imagePositionY: 'Foco vertical',
      resetFraming: 'Redefinir enquadramento',
      dragPreview: 'Imagem da prévia. Arraste para reposicionar; use as setas para ajustar o foco.',
      shadow: 'Sombra',
      cornerRadius: 'Raio dos cantos',
      windowTitle: 'Título da janela',
      backgroundType: 'Tipo de fundo',
      solid: 'Sólido',
      gradient: 'Gradiente',
      image: 'Imagem',
      palette: 'Paleta',
      gradientPresets: 'Presets de gradiente',
      type: 'Tipo',
      angle: 'Ângulo',
      start: 'Início',
      end: 'Fim',
      backgroundImageUrl: 'URL da imagem de fundo',
      backgroundImagePlaceholder: 'Cole uma URL de imagem para o fundo',
      canvasPadding: 'Padding do canvas',
      format: 'Formato',
      scale: 'Escala',
      exportButton: 'Exportar imagem',
      exportHint: 'Exporta o canvas atual como ele aparece.',
    },
    footer: {
      language: 'Idioma',
      lastCommit: 'Último commit',
      repository: 'Repositório',
    },
  },
  es: {
    brandName: 'Fremit',
    nav: {
      home: 'Inicio',
      about: 'Sobre',
      openApp: 'Abrir app',
      menu: 'Menú',
      backToSite: 'Volver al sitio',
      controls: 'Controles',
      close: 'Cerrar',
      repository: 'Repositorio',
    },
    theme: {
      label: 'Tema',
      dark: 'Oscuro',
      light: 'Claro',
      colorSelector: 'Selector de color',
      current: 'Tema actual',
      toggleToDark: 'Cambiar al tema oscuro',
      toggleToLight: 'Cambiar al tema claro',
    },
    home: {
      title: 'Pega, edita y exporta.',
      subtitle: 'Un enlace, una imagen o una captura. Ajusta el marco y exporta.',
    },
    about: {
      eyebrow: 'Sobre',
      title: 'Cómo usar Fremit.',
      intro: 'Fremit convierte un enlace, captura o imagen en un mockup listo para exportar.',
      workflowTitle: 'Cómo funciona',
      workflow: [
        {
          title: 'Trae la fuente',
          body: 'Pega una URL, usa una URL directa de imagen, sube una captura o pega directo desde el portapapeles.',
        },
        {
          title: 'Elige el marco',
          body: 'Cambia entre navegador, phone, tablet, portrait, landscape o un viewport personalizado.',
        },
        {
          title: 'Ajusta y exporta',
          body: 'Refina el fondo, la escala y los detalhes de la ventana, y luego exporta el canvas actual en PNG o JPG.',
        },
      ],
      featuresTitle: 'Lo que puedes ajustar',
      features: [
        {
          title: 'Presets de navegador',
          body: 'macOS, Windows, navegador minimalista o sin chrome.',
        },
        {
          title: 'Marcos de phone y tablet',
          body: 'Shells genéricos de mobile y tablet con portrait y landscape.',
        },
        {
          title: 'Captura de páginas dinámicas',
          body: 'Espera contenido asíncrono, elige una ruta pública o enfoca una sección específica antes de aplicar el marco.',
        },
        {
          title: 'Fondo y exportación',
          body: 'Fondos sólidos, gradientes o imagen con control de escala para exportar.',
        },
      ],
      developerTitle: 'Sobre mafhper',
      developerBody:
        'Creo en una web libre, enriquecida con aplicaciones hechas con cuidado. Herramientas simples que resuelven problemas reales.',
      developerOpenSource:
        'Todos mis proyectos son open source. Puedes explorar el código, contribuir, hacer fork o simplemente aprender. La web debe ser de todos.',
      developerProjects: 'Ver otros proyectos',
      faq: {
        title: 'Preguntas frecuentes.',
        intro: 'Respuestas cortas sobre uso, exportación y los límites del modo URL.',
        questions: [
          {
            question: '¿Por qué falla un enlace a veces?',
            answer: 'El modo URL depende de lo que el sitio de destino exponga. Algunos sitios simplemente no ofrecen un preview utilizable.',
          },
          {
            question: '¿Cuándo debo usar una captura manual?',
            answer: 'Usa una captura en páginas privadas, apps con login, vistas dinámicas o cuando el preview de la URL no coincida.',
          },
          {
            question: '¿Puedo exportar mockups de phone y tablet?',
            answer: 'Sí. El editor incluye marcos genéricos de phone y tablet con orientación portrait y landscape.',
          },
          {
            question: '¿Qué puedo exportar?',
            answer: 'El canvas actual puede exportarse en PNG o JPG a la escala que elijas.',
          },
        ],
        limitationsTitle: 'Limitaciones del modo URL',
        limitationsIntro: 'Estos puntos definen el límite real de la captura por URL dentro de Fremit.',
        limitations: [
          {
            question: '¿Funcionan páginas privadas o autenticadas?',
            answer: 'No. El modo URL no accede a sesiones privadas ni contenido autenticado.',
          },
          {
            question: '¿Las SPA siempre resuelven bien?',
            answer: 'No siempre. Fremit puede esperar contenido dinámico y enfocar una sección con un selector CSS, pero no reproduce login ni estados que requieren interacción.',
          },
          {
            question: '¿Un enlace fallido borra el canvas actual?',
            answer: 'No. Una URL fallida mantiene tu última composición y pide una captura.',
          },
        ],
      },
    },
    source: {
      label: 'Insertar un enlace',
      pageUrlLabel: 'Página para capturar',
      placeholder: 'Pega la URL de un sitio o imagen...',
      submit: 'Abrir en Editor',
      capturePage: 'Capturar página',
      loading: 'Cargando...',
      captureDelay: 'Esperar la página',
      captureDelayHint: 'Da tiempo al contenido dinámico para terminar de renderizar.',
      captureQuick: 'Rápida · 1 segundo',
      captureBalanced: 'Equilibrada · 3 segundos',
      captureComplete: 'Página compleja · 5 segundos',
      captureSelector: 'Sección en foco (opcional)',
      captureSelectorPlaceholder: 'Ejemplo: main o #hero',
      captureSelectorHint: 'Espera este selector CSS y captura solo esa sección.',
      upload: 'Subir imagen',
      uploadHint: 'o arrastra aquí',
      paste: 'Pegar',
      pasteHint: 'Usa lo que está en el portapapeles',
      helper: 'Pega un enlace o arrastra una imagen para empezar.',
      fallbackTitle: 'Usa una captura',
      fallbackAction: 'La composición actual sigue intacta.',
      genericError: 'La fuente no pudo cargarse. Inténtalo otra vez o usa una captura.',
    },
    editor: {
      title: 'Editor',
      subtitle: 'Ajuste e exporte.',
      noSource: 'Todavía no hay fuente cargada',
      noSourceHint: 'Pega un enlace, sube una captura o usa el portapapeles.',
      currentSource: 'Fuente actual',
      openControls: 'Controles',
      closeControls: 'Cerrar controles',
      sourceKinds: {
        websiteUrl: 'URL del sitio',
        imageUrl: 'URL de la imagen',
        upload: 'Imagen subida',
        clipboardImage: 'Imagen pegada',
      },
      sections: {
        source: 'Fuente',
        frame: 'Marco',
        background: 'Fondo',
        export: 'Exportar',
      },
      previewEmptyTag: 'Listo',
      previewEmptyTitle: 'Suelta una captura o pega un enlace.',
      previewEmptyBody: 'El canvas escala al viewport y mantiene el export listo.',
    },
    canvas: {
      insert: 'Insertar',
      addText: 'Añadir texto',
      addShape: 'Añadir forma',
      addImage: 'Añadir imagen',
      zoom: 'Zoom',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      zoomFit: 'Ajustar a la página',
      snap: 'Ajustar a las guías',
      layers: 'Capas',
      layersEmpty: 'Todavía no hay objetos en esta página.',
      addObject: 'Añadir objeto',
      duplicateObject: 'Duplicar objeto',
      layerUp: 'Subir capa',
      layerDown: 'Bajar capa',
      deleteObject: 'Eliminar objeto',
      showObject: 'Mostrar objeto',
      hideObject: 'Ocultar objeto',
      lockObject: 'Bloquear objeto',
      unlockObject: 'Desbloquear objeto',
      pages: 'Páginas',
      addPage: 'Añadir página',
      duplicatePage: 'Duplicar página',
      pageUp: 'Subir página',
      pageDown: 'Bajar página',
      pageName: 'Nombre de la página',
      format: 'Formato',
      formatPoster: 'Póster',
      formatBanner: 'Banner',
      formatHero: 'Hero',
      exportFormat: 'Formato del archivo',
      exportQuality: 'Calidad de exportación',
      exportPage: 'Exportar página',
      exporting: 'Exportando...',
      exportHint: 'Renderiza la página activa desde el documento.',
      exportError: 'La exportación falló. Inténtalo de nuevo.',
      exportFallbackToPng: 'Navegador sin WebP — PNG entregado.',
      selection: 'Selección',
      canvasLabel: 'Área de trabajo del lienzo',
    },
    text: {
      headings: 'Títulos',
      subheading: 'Subtítulo',
      body: 'Cuerpo',
      fontPairings: 'Pares de fuentes',
      lists: 'Listas',
      bulletedList: 'Lista con viñetas',
      numberedList: 'Lista numerada',
      classic: 'Clásico',
      modern: 'Moderno',
      editorial: 'Editorial',
      playful: 'Divertido',
      poster: 'Póster',
      elegant: 'Elegante',
      curved: 'Curvado',
      arcUp: 'Arco hacia arriba',
      arcDown: 'Arco hacia abajo',
    },
    brand: {
      palette: 'Paleta',
      paletteHint: 'Haz clic en un color para rellenar la selección; sin selección, rellena la página.',
      addColor: 'Añadir color',
      removeColor: 'Quitar color',
      fonts: 'Fuentes',
      headingFont: 'Título',
      bodyFont: 'Cuerpo',
      applyFont: 'Aplicar al texto seleccionado',
      logo: 'Logo',
      uploadLogo: 'Subir logo',
      insertLogo: 'Insertar en la página',
      removeLogo: 'Quitar logo',
      error: 'El logo no pudo añadirse.',
    },
    shapes: {
      rectangle: 'Rectángulo',
      ellipse: 'Elipse',
      triangle: 'Triángulo',
      line: 'Línea',
      star: 'Estrella',
      polygon: 'Polígono',
    },
    templates: {
      socialPost: 'Post social',
      quoteCard: 'Tarjeta de cita',
      announcement: 'Anuncio',
      eventPoster: 'Cartel de evento',
      saleBanner: 'Banner de oferta',
      heroSlide: 'Diapositiva destacada',
      productCard: 'Tarjeta de producto',
      statsCard: 'Tarjeta de cifras',
      storyPromo: 'Story promocional',
      newsletterHeader: 'Encabezado de boletín',
      readmeHero369: 'Hero de README 369',
      readmeHero430: 'Hero de README 430',
      readmeHero720: 'Hero de README 720',
      readmeHero840: 'Hero de README 840',
      readmeHero1200: 'Hero de README 1200',
      readmeHeroFluid100: 'Hero de README 100%',
      readmeHeroAnim760: 'Hero de README anim 760',
      readmeHeroAnim800: 'Hero de README anim 800',
      readmeHeroAnimFluid100: 'Hero de README anim 100%',
      readmeDemo600: 'Demo de README 600',
      readmeDemoAnim23: 'Demo de README anim 23%',
      readmeDemoAnim80: 'Demo de README anim 80%',
      sponsorsTable: 'Tabla de patrocinadores',
      releaseGrade: 'Notas de versión',
      profileHero640: 'Hero de perfil 640',
      profileHero400: 'Hero de perfil 400',
      profileHeroFluid100: 'Hero de perfil 100%',
      sectionTitleIllustrated: 'Título de sección (ilustrado)',
      partial: 'Parcial',
      githubProject: 'Proyecto de GitHub',
      githubRepo: 'Repositorio',
      githubRepoPlaceholder: 'usuario/repositorio',
      githubFill: 'Usar datos del repositorio',
      githubFilled: 'Repositorio cargado.',
      githubFallback: 'GitHub no disponible — se mantienen los marcadores.',
      sectionOwn: 'Diseños propios',
      sectionReadmeHeroes: 'Heroes de README',
      sectionAnimated: 'Animados',
      sectionReadmeDemo: 'Demo de README',
      sectionSponsors: 'Patrocinadores',
      sectionRelease: 'Notas de versión',
      sectionProfile: 'Heroes de perfil',
      sectionTitles: 'Títulos de sección',
    },
    stickers: {
      tab: 'Stickers',
      badgeNew: 'Sello NUEVO',
      saleTag: 'Etiqueta de oferta',
      speechBubble: 'Bocadillo',
      starRating: 'Valoración en estrellas',
      checkBadge: 'Sello de confirmación',
      arrowRight: 'Flecha',
      heart: 'Corazón',
      sparkles: 'Destellos',
      quoteMark: 'Comillas',
      dotGrid: 'Cuadrícula de puntos',
    },
    icons: {
      tab: 'Iconos',
      workspace: 'Contenido',
      search: 'Buscar iconos',
      category: 'Categoría',
      allCategories: 'Todas las categorías',
      style: 'Estilo',
      showMore: 'Mostrar más',
      properties: 'Propiedades',
      colorMode: 'Modo de color',
      solid: 'Sólido',
      gradient: 'Degradado',
      start: 'Inicio',
      end: 'Fin',
      primary: 'Primario',
      secondary: 'Secundario',
      designed: 'Este estilo conserva sus colores originales.',
      insert: 'Insertar icono',
      insertHint: 'Vuelve a insertar el icono para cambiar los colores.',
      empty: 'Ningún icono coincide.',
      error: 'No se pudo cargar el icono.',
      styles: {
        normal: 'Contorno',
        duotone: 'Duotono',
        fill: 'Relleno',
        pixelated: 'Pixelado',
        glass: 'Cristal',
      },
      categories: {
        accessibility: 'Accesibilidad',
        action: 'Acciones',
        commerce: 'Comercio',
        communication: 'Comunicación',
        dev: 'Desarrollo',
        feedback: 'Feedback',
        files: 'Archivos',
        hardware: 'Hardware',
        layout: 'Diseño',
        media: 'Medios',
        metrics: 'Métricas',
        misc: 'Varios',
        navigation: 'Navegación',
        time: 'Tiempo',
        users: 'Personas',
        weather: 'Clima',
      },
    },
    inspector: {
      name: 'Nombre de la capa',
      position: 'Posición',
      size: 'Tamaño',
      width: 'Ancho',
      height: 'Alto',
      rotation: 'Rotación',
      opacity: 'Opacidad',
      typography: 'Tipografía',
      fontFamily: 'Fuente',
      fontSize: 'Tamaño de fuente',
      fontWeight: 'Peso',
      align: 'Alineación',
      alignLeft: 'Alinear a la izquierda',
      alignCenter: 'Centrar',
      alignRight: 'Alinear a la derecha',
      appearance: 'Apariencia',
      paint: 'Pintura',
      fill: 'Relleno',
      stroke: 'Contorno',
      strokeWidth: 'Grosor del contorno',
      cornerRadius: 'Radio de esquinas',
      sides: 'Lados',
      innerRadius: 'Radio interno (%)',
      length: 'Longitud',
      image: 'Imagen',
      fit: 'Ajuste',
      mask: 'Máscara',
      maskRounded: 'Esquinas redondeadas',
      maskNone: 'Ninguna',
      locked: 'Bloqueado: desbloquea para editar.',
      curve: 'Curva',
      curveText: 'Curvar texto',
      arcDirection: 'Dirección',
      arcAmount: 'Curvatura',
      straighten: 'Enderezar',
    },
    animate: {
      element: 'Elemento',
      elementHint: 'Selecciona un objeto y elige su entrada.',
      noSelection: 'Selecciona un objeto en el lienzo para animarlo.',
      remove: 'Quitar animación',
      page: 'Página',
      pageHint: 'Reproduce la transición y cada capa animada.',
      duration: 'Duración (ms)',
      easing: 'Curva',
      direction: 'Dirección',
      preview: 'Vista previa',
      previewPage: 'Vista previa de la página',
      present: 'Presentar',
      none: 'Ninguna',
      presets: {
        fade: 'Fade',
        rise: 'Subida',
        pop: 'Pop',
        slide: 'Deslizar',
        words: 'Palabras',
        typewriter: 'Máquina de escribir',
        wipe: 'Barrido',
        focus: 'Enfoque',
      },
      transitions: {
        fade: 'Fade',
        dip: 'Fundido a negro',
        dissolve: 'Disolver',
        blur: 'Desenfoque',
        slide: 'Deslizar',
        push: 'Empujar',
        cover: 'Cubrir',
        uncover: 'Descubrir',
        zoom: 'Zoom',
        wipe: 'Barrido',
        circle: 'Círculo',
        flip: 'Voltear',
        spin: 'Girar',
        blinds: 'Persianas',
      },
      easings: {
        linear: 'Lineal',
        easeOut: 'Salida suave',
        easeInOut: 'Suave en los extremos',
        backOut: 'Con sobreimpulso',
      },
      directions: {
        up: 'Arriba',
        down: 'Abajo',
        left: 'Izquierda',
        right: 'Derecha',
      },
    },
    },
    controls: {
      frameFamily: 'Familia del marco',
      desktop: 'Desktop',
      mobileTablet: 'Phone / Tablet',
      chromePreset: 'Preset del navegador',
      darkChrome: 'Chrome escuro',
      showTitle: 'Mostrar título',
      devicePreset: 'Preset del device',
      orientation: 'Orientación',
      portrait: 'Portrait',
      landscape: 'Landscape',
      showCamera: 'Mostrar área de cámara',
      viewportPreset: 'Preset de viewport',
      width: 'Ancho',
      height: 'Alto',
      imageFit: 'Ajuste de imagen',
      fitContain: 'Mostrar imagen completa',
      fitCover: 'Llenar el marco',
      imageFraming: 'Encuadre',
      imageFramingHint: 'Arrastra la vista previa o ajusta el foco con precisión.',
      imageZoom: 'Zoom',
      imagePositionX: 'Foco horizontal',
      imagePositionY: 'Foco vertical',
      resetFraming: 'Restablecer encuadre',
      dragPreview: 'Imagen de vista previa. Arrastra para reposicionar; usa las flechas para ajustar el foco.',
      shadow: 'Sombra',
      cornerRadius: 'Radio de esquinas',
      windowTitle: 'Título da janela',
      backgroundType: 'Tipo de fundo',
      solid: 'Sólido',
      gradient: 'Gradiente',
      image: 'Imagen',
      palette: 'Paleta',
      gradientPresets: 'Presets de gradiente',
      type: 'Tipo',
      angle: 'Ángulo',
      start: 'Inicio',
      end: 'Fin',
      backgroundImageUrl: 'URL de imagen de fondo',
      backgroundImagePlaceholder: 'Pega una URL de imagen para el fondo',
      canvasPadding: 'Padding do canvas',
      format: 'Formato',
      scale: 'Escala',
      exportButton: 'Exportar imagen',
      exportHint: 'Exporta el canvas actual tal como se ve.',
    },
    footer: {
      language: 'Idioma',
      lastCommit: 'Último commit',
      repository: 'Repositorio',
    },
  },
};
