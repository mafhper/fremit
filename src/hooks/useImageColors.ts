import { useEffect } from 'react';
import { getPaletteSync } from 'colorthief';
import { useStore } from '@/store/useStore';

function toRgbString(color: { rgb(): { r: number; g: number; b: number } }) {
  const { r, g, b } = color.rgb();
  return `rgb(${r},${g},${b})`;
}

export function useImageColors() {
  const imageUrl = useStore((state) => state.source.active?.resolvedImageUrl);
  const updateBackground = useStore((state) => state.updateBackground);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const palette = getPaletteSync(img, { colorCount: 4 });

        if (palette && palette.length >= 3) {
          const color1 = toRgbString(palette[0]);
          const color2 = toRgbString(palette[1]);
          const color3 = toRgbString(palette[2]);

          updateBackground({
            bgType: 'gradient',
            bgGradientType: 'linear',
            bgGradientDirection: 140,
            bgGradient: `linear-gradient(140deg, ${color1} 0%, ${color2} 54%, ${color3} 100%)`,
            bgColor: color2,
          });
        }
      } catch (error) {
        console.error('Failed to extract colors:', error);
      }
    };
  }, [imageUrl, updateBackground]);
}
