import { useEffect } from 'react';
import ColorThief from 'colorthief';
import { useStore } from '@/store/useStore';

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
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 4);

        if (palette && palette.length >= 3) {
          const color1 = `rgb(${palette[0].join(',')})`;
          const color2 = `rgb(${palette[1].join(',')})`;
          const color3 = `rgb(${palette[2].join(',')})`;

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
