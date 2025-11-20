import { useEffect } from 'react';
import ColorThief from 'colorthief';
import { useStore } from '@/store/useStore';
import { getProxiedUrl } from '@/lib/utils';

export function useImageColors() {
    const { imageUrl, setConfig } = useStore();

    useEffect(() => {
        if (!imageUrl) return;

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = getProxiedUrl(imageUrl);

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 2);

                if (palette && palette.length >= 2) {
                    const color1 = `rgb(${palette[0].join(',')})`;
                    const color2 = `rgb(${palette[1].join(',')})`;

                    // Set a nice gradient based on dominant colors
                    setConfig({
                        bgType: 'gradient',
                        bgGradient: `linear-gradient(135deg, ${color1}, ${color2})`,
                        bgColor: color1 // Fallback or solid option
                    });
                }
            } catch (error) {
                console.error('Failed to extract colors:', error);
            }
        };
    }, [imageUrl, setConfig]);
}
