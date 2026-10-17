/**
 * The app background slice as CSS. The dedicated canvas uses it as the
 * workspace backdrop (the page keeps its own background from the document),
 * which keeps `useStore.background` meaningful on `/editor`.
 */

import type { CSSProperties } from 'react';
import type { BackgroundState } from '@/types/app';

export function backgroundStyle(background: BackgroundState): CSSProperties {
  if (background.bgType === 'solid') {
    return { backgroundColor: background.bgColor };
  }

  if (background.bgType === 'gradient') {
    return { backgroundImage: background.bgGradient };
  }

  return background.bgImage
    ? {
        backgroundImage: `url(${background.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};
}
