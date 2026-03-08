import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

function IconFrame({ children, className, viewBox = '0 0 24 24' }: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} fill="none" className={cn('h-5 w-5', className)} aria-hidden="true">
      {children}
    </svg>
  );
}

export function LinkPanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor" opacity="0.14" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M9.5 9.5 7.9 11.1a2.4 2.4 0 0 0 0 3.4 2.4 2.4 0 0 0 3.4 0l1.2-1.2m.2-2.6 1.2-1.2a2.4 2.4 0 0 1 3.4 0 2.4 2.4 0 0 1 0 3.4l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function UploadPanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path d="M6 16.5h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 6.5v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m8.5 10 3.5-3.5L15.5 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" opacity="0.12" />
    </IconFrame>
  );
}

export function SourcePanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="4" y="6" width="16" height="12" rx="3" fill="currentColor" opacity="0.12" />
      <path d="M12 6.8v6.2m0 0 2.5-2.5M12 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16.7h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

export function ClipboardPanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="6" y="5" width="12" height="15" rx="3" fill="currentColor" opacity="0.12" />
      <rect x="9" y="3.5" width="6" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

export function ExportPanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="4" y="6" width="16" height="12" rx="3" fill="currentColor" opacity="0.12" />
      <path d="M12 7.5v7m0 0 2.8-2.8M12 14.5l-2.8-2.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 17h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

export function DevicePanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="3.5" y="5" width="10" height="14" rx="2.5" fill="currentColor" opacity="0.12" />
      <rect x="15.5" y="7.5" width="5" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="5.7" y="7.2" width="5.6" height="9.6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.5" cy="17.2" r="0.8" fill="currentColor" />
    </IconFrame>
  );
}

export function BrowserPanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="3.5" y="5.2" width="17" height="13.6" rx="3" fill="currentColor" opacity="0.12" />
      <rect x="5.4" y="8.6" width="13.2" height="8.1" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.8 8.4h16.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="6.7" cy="6.8" r="0.75" fill="currentColor" />
      <circle cx="9.5" cy="6.8" r="0.75" fill="currentColor" opacity="0.82" />
      <circle cx="12.3" cy="6.8" r="0.75" fill="currentColor" opacity="0.6" />
    </IconFrame>
  );
}

export function ThemeDarkIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path
        d="M14.8 4.7A6.8 6.8 0 1 0 19.3 14 5.6 5.6 0 0 1 14.8 4.7Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M15.3 4.8a6.8 6.8 0 1 0 4 9.5 5.7 5.7 0 0 1-4-9.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function ThemeLightIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <circle cx="12" cy="12" r="3.3" fill="currentColor" opacity="0.14" />
      <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.8v2.1M12 18.1v2.1M20.2 12h-2.1M5.9 12H3.8M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5M17.8 17.8l-1.5-1.5M7.7 7.7 6.2 6.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

export function GlobePanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.12" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.8 12h14.4M12 4.2c2.1 2.2 3.2 5 3.2 7.8S14.1 17.6 12 19.8M12 4.2C9.9 6.4 8.8 9.2 8.8 12s1.1 5.6 3.2 7.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconFrame>
  );
}

export function MenuPanelIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <rect x="4" y="6" width="16" height="12" rx="3" fill="currentColor" opacity="0.12" />
      <path d="M8 9.5h8M8 12h8M8 14.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}
