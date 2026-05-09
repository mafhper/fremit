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
    placeholder: string;
    submit: string;
    loading: string;
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
          title: 'Viewport-aware previews',
          body: 'Website captures can follow the selected viewport instead of staying stuck in one desktop shot.',
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
            answer: 'Not always. If the site does not publish a usable preview, Fremit cannot reconstruct the live page.',
          },
          {
            question: 'Will a failed link erase my current canvas?',
            answer: 'No. A failed URL keeps your last working composition and prompts for a screenshot.',
          },
        ],
      },
    },
    source: {
      label: 'Link or image URL',
      placeholder: 'https://your-site.com or a direct image URL',
      submit: 'Open',
      loading: 'Loading...',
      upload: 'Upload',
      uploadHint: 'Choose an image file',
      paste: 'Paste',
      pasteHint: 'Use what is in the clipboard',
      helper: 'Paste a link, upload a screenshot, or use the clipboard.',
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
          title: 'Preview guiado por viewport',
          body: 'Capturas de site podem seguir o viewport selecionado, em vez de ficar presas a um único desktop.',
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
            answer: 'O modo URL depende do que o site de destino expõe. Alguns sites simplesmente não fornecem um preview utilizável.',
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
            answer: 'Nem sempre. Se o site não publicar um preview utilizável, o Fremit não consegue reconstruir a página ao vivo.',
          },
          {
            question: 'Um link com falha apaga meu canvas atual?',
            answer: 'Não. Uma URL com falha mantém sua última composição e pede um screenshot.',
          },
        ],
      },
    },
    source: {
      label: 'Link ou URL da imagem',
      placeholder: 'https://seu-site.com ou uma URL direta de imagem',
      submit: 'Abrir',
      loading: 'Carregando...',
      upload: 'Enviar',
      uploadHint: 'Escolha um arquivo de imagem',
      paste: 'Colar',
      pasteHint: 'Use o que está na área de transferência',
      helper: 'Cole um link, envie um screenshot ou use a área de transferência.',
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
          body: 'Refina el fondo, la escala y los detalles de la ventana, y luego exporta el canvas actual en PNG o JPG.',
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
          title: 'Preview guiado por viewport',
          body: 'Las capturas del sitio pueden seguir el viewport seleccionado en lugar de quedar fijadas en una sola versión desktop.',
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
            answer: 'No siempre. Si el sitio no publica un preview utilizable, Fremit no puede reconstruir la página en vivo.',
          },
          {
            question: '¿Un enlace fallido borra el canvas actual?',
            answer: 'No. Una URL fallida mantiene tu última composición y pide una captura.',
          },
        ],
      },
    },
    source: {
      label: 'Enlace o URL de imagen',
      placeholder: 'https://tu-sitio.com o una URL directa de imagen',
      submit: 'Abrir',
      loading: 'Cargando...',
      upload: 'Subir',
      uploadHint: 'Elige un archivo de imagen',
      paste: 'Pegar',
      pasteHint: 'Usa lo que está en el portapapeles',
      helper: 'Pega un enlace, sube una captura o usa el portapapeles.',
      fallbackTitle: 'Usa una captura',
      fallbackAction: 'La composición actual sigue intacta.',
      genericError: 'La fuente no pudo cargarse. Inténtalo otra vez o usa una captura.',
    },
    editor: {
      title: 'Editor',
      subtitle: 'Ajusta y exporta.',
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
      darkChrome: 'Chrome oscuro',
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
      shadow: 'Sombra',
      cornerRadius: 'Radio de esquinas',
      windowTitle: 'Título de la ventana',
      backgroundType: 'Tipo de fondo',
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
      canvasPadding: 'Padding del canvas',
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
