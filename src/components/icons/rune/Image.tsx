/**
 * Runeicons `playback-image` (normal) — vendored 1:1 from the upstream artwork.
 * Source: public/normal/playback/image.svg @ Runeicons/runeicons@2f2a86a (2026-10-11) (Apache-2.0, Part 1).
 * Only the stroke color is normalized (`black` → `currentColor`, inherited
 * from the frame); the geometry is unchanged. See NOTICE.
 */

import { RuneIcon, type RuneIconProps } from '../RuneIcon';

export function RuneImageIcon(props: RuneIconProps) {
  return (
    <RuneIcon {...props}>
      <path d="M21 14.9999L17.914 11.9139C17.5389 11.539 17.0303 11.3284 16.5 11.3284C15.9697 11.3284 15.4611 11.539 15.086 11.9139L6 20.9999M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3ZM11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z" />
    </RuneIcon>
  );
}
