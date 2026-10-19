import { describe, expect, it } from 'vitest';
import { backgroundStyle } from '@/lib/backgroundStyle';
import type { BackgroundState } from '@/types/app';

const base: BackgroundState = {
  bgType: 'solid',
  bgColor: '#faf4ea',
  bgGradient: 'linear-gradient(135deg, #f7f0e7 0%, #cfe2df 52%)',
  bgGradientType: 'linear',
  bgGradientDirection: 135,
  bgImage: null,
  padding: 56,
};

describe('backgroundStyle', () => {
  it('maps a solid background to a color', () => {
    expect(backgroundStyle(base)).toEqual({ backgroundColor: '#faf4ea' });
  });

  it('maps a gradient background to an image layer', () => {
    expect(backgroundStyle({ ...base, bgType: 'gradient' })).toEqual({
      backgroundImage: base.bgGradient,
    });
  });

  it('maps an image background to a covering layer', () => {
    expect(backgroundStyle({ ...base, bgType: 'image', bgImage: 'data:image/png;base64,x' })).toEqual(
      {
        backgroundImage: 'url(data:image/png;base64,x)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
    );
  });

  it('falls back to no style for an image background without an image', () => {
    expect(backgroundStyle({ ...base, bgType: 'image', bgImage: null })).toEqual({});
  });
});
