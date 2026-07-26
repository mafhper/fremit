export type Locale = 'en-US' | 'pt-BR' | 'es';

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
