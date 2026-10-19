/**
 * Runeicons `arrows-chevron-up` (normal) — vendored 1:1 from the upstream artwork.
 * Source: public/normal/arrows/chevron-up.svg @ Runeicons/runeicons@2f2a86a (2026-10-11) (Apache-2.0, Part 1).
 * Only the stroke color is normalized (`black` → `currentColor`, inherited
 * from the frame); the geometry is unchanged. See NOTICE.
 */

import { RuneIcon, type RuneIconProps } from '../RuneIcon';

export function RuneChevronUpIcon(props: RuneIconProps) {
  return (
    <RuneIcon {...props}>
      <path d="M18 15L12 9L6 15" />
    </RuneIcon>
  );
}
