/**
 * Artboard.tsx
 * Prancheta do canvas: muda de proporção por formato, aceita imagem por arrastar/colar e a
 * apresenta numa moldura escura. O conteúdo do estado vazio (título, campo de link, botões)
 * e as ações do estado com imagem entram por props, então a prancheta não conhece o app.
 */

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '@/lib/utils';
import {
  aspectRatio,
  formatDimensions,
  getArtboardFormat,
  isAcceptedImage,
  type ArtboardFormatId,
} from './formats';
import './Artboard.css';

export interface ArtboardImage {
  src: string;
  name: string;
}

export interface ArtboardGeometry {
  artboard: DOMRect;
  device: DOMRect;
  image: HTMLImageElement;
}

export interface ArtboardHandle {
  /** Medidas atuais para a exportação; null enquanto não há imagem emoldurada. */
  getGeometry: () => ArtboardGeometry | null;
}

interface ArtboardProps {
  format: ArtboardFormatId;
  /** Nome localizado do formato (ex.: "Hero"). */
  formatLabel: string;
  /** Texto do overlay ao arrastar um arquivo (ex.: "Solte para emoldurar"). */
  dropLabel: string;
  image?: ArtboardImage | null;
  onFile?: (file: File) => void;
  /** Conteúdo exibido quando não há imagem. */
  empty?: ReactNode;
  /** Ações exibidas abaixo da prancheta quando há imagem (exportar, limpar...). */
  actions?: ReactNode;
  /** Captura imagens coladas (Ctrl/Cmd+V) em qualquer ponto da janela. Padrão: true. */
  listenPaste?: boolean;
  className?: string;
  ref?: Ref<ArtboardHandle>;
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

export function Artboard({
  format,
  formatLabel,
  dropLabel,
  image = null,
  onFile,
  empty,
  actions,
  listenPaste = true,
  className,
  ref,
}: ArtboardProps) {
  const artboardRef = useRef<HTMLElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [over, setOver] = useState(false);
  const spec = getArtboardFormat(format);

  useImperativeHandle(
    ref,
    () => ({
      getGeometry: () => {
        const artboard = artboardRef.current;
        const device = deviceRef.current;
        const img = imageRef.current;
        if (!artboard || !device || !img) return null;
        return {
          artboard: artboard.getBoundingClientRect(),
          device: device.getBoundingClientRect(),
          image: img,
        };
      },
    }),
    [],
  );

  useEffect(() => {
    if (!listenPaste || !onFile) return;

    const onPaste = (event: ClipboardEvent) => {
      const file = event.clipboardData?.files?.[0];
      if (file && isAcceptedImage(file)) onFile(file);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [listenPaste, onFile]);

  const handleDrag = (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    // Ignora o "leave" causado por entrar em um filho da própria prancheta.
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && isAcceptedImage(file)) onFile?.(file);
  };

  return (
    <section
      ref={artboardRef}
      className={cn('artboard', className)}
      aria-label={formatLabel}
      data-format={format}
      data-has-image={image ? 'true' : 'false'}
      data-over={over ? 'true' : 'false'}
      style={{ '--ar': aspectRatio(spec) } as CSSProperties}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="artboard__label">
        {formatLabel} · {formatDimensions(spec)}
      </span>

      {image ? (
        <div ref={deviceRef} className="artboard__device" data-testid="artboard-device">
          <div className="artboard__chrome" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{image.name}</span>
          </div>
          <img ref={imageRef} src={image.src} alt={image.name} />
        </div>
      ) : (
        <div className="artboard__empty">{empty}</div>
      )}

      {image && actions ? <div className="artboard__actions">{actions}</div> : null}

      <div className="artboard__drop" aria-hidden="true">
        {dropLabel}
      </div>
    </section>
  );
}
