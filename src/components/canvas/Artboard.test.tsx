/**
 * Artboard.test.tsx
 * Cobre proporção por formato, estados vazio/com imagem, arrastar/soltar e colar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Artboard } from './Artboard';

afterEach(cleanup);

const png = (name = 'tela.png') => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
const pdf = () => new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' });

function setup(props: Partial<React.ComponentProps<typeof Artboard>> = {}) {
  return render(
    <Artboard
      format="hero"
      formatLabel="Hero"
      dropLabel="Solte para emoldurar"
      empty={<p>conteúdo vazio</p>}
      {...props}
    />,
  );
}

describe('Artboard', () => {
  it('expõe a região com o nome e as dimensões do formato', () => {
    setup({ format: 'banner', formatLabel: 'Banner' });
    const region = screen.getByRole('region', { name: 'Banner' });
    expect(region).toHaveAttribute('data-format', 'banner');
    expect(region).toHaveTextContent('Banner · 1500 × 500');
  });

  it('define a proporção da prancheta a partir do formato', () => {
    setup({ format: 'post', formatLabel: 'Post' });
    expect(screen.getByRole('region').style.getPropertyValue('--ar')).toBe('1');
  });

  it('mostra o conteúdo vazio e oculta a moldura sem imagem', () => {
    setup();
    expect(screen.getByText('conteúdo vazio')).toBeInTheDocument();
    expect(screen.queryByTestId('artboard-device')).not.toBeInTheDocument();
  });

  it('emoldura a imagem e exibe as ações quando há imagem', () => {
    setup({ image: { src: 'blob:x', name: 'home.png' }, actions: <button type="button">Baixar PNG</button> });
    expect(screen.queryByText('conteúdo vazio')).not.toBeInTheDocument();
    expect(screen.getByAltText('home.png')).toHaveAttribute('src', 'blob:x');
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeInTheDocument();
  });

  it('chama onFile ao soltar uma imagem e ignora outros tipos', () => {
    const onFile = vi.fn();
    setup({ onFile });
    const region = screen.getByRole('region');

    fireEvent.drop(region, { dataTransfer: { files: [pdf()], types: ['Files'] } });
    expect(onFile).not.toHaveBeenCalled();

    const file = png();
    fireEvent.drop(region, { dataTransfer: { files: [file], types: ['Files'] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('marca o estado "soltar" ao arrastar arquivos e o remove ao sair', () => {
    setup({ onFile: vi.fn() });
    const region = screen.getByRole('region');

    fireEvent.dragEnter(region, { dataTransfer: { types: ['Files'] } });
    expect(region).toHaveAttribute('data-over', 'true');

    fireEvent.dragLeave(region);
    expect(region).toHaveAttribute('data-over', 'false');
  });

  it('não reage ao arrastar texto (sem arquivos)', () => {
    setup({ onFile: vi.fn() });
    const region = screen.getByRole('region');
    fireEvent.dragEnter(region, { dataTransfer: { types: ['text/plain'] } });
    expect(region).toHaveAttribute('data-over', 'false');
  });

  it('aceita imagem colada na janela e respeita listenPaste={false}', () => {
    const onFile = vi.fn();
    const { unmount } = setup({ onFile });
    const file = png('colada.png');

    fireEvent.paste(window, { clipboardData: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
    unmount();

    const ignored = vi.fn();
    setup({ onFile: ignored, listenPaste: false });
    fireEvent.paste(window, { clipboardData: { files: [png()] } });
    expect(ignored).not.toHaveBeenCalled();
  });

  it('getGeometry retorna null sem imagem', () => {
    const ref = { current: null as import('./Artboard').ArtboardHandle | null };
    setup({ ref });
    expect(ref.current?.getGeometry()).toBeNull();
  });
});
