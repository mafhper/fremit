import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { getDeviceMetrics } from './previewMetrics';

const shadowStyleMap = {
  none: {},
  sm: { boxShadow: '0 10px 24px rgba(9, 15, 25, 0.10)' },
  md: { boxShadow: '0 16px 34px rgba(9, 15, 25, 0.14)' },
  lg: { boxShadow: '0 24px 48px rgba(9, 15, 25, 0.18)' },
  xl: { boxShadow: '0 30px 58px rgba(9, 15, 25, 0.22)' },
  '2xl': { boxShadow: '0 40px 80px rgba(9, 15, 25, 0.26)' },
} as const;

function PreviewImage() {
  const sourceMode = useStore((state) => state.source.active?.mode);
  const imageUrl = useStore((state) => state.source.active?.resolvedImageUrl);
  const fitMode = useStore((state) => state.frame.fitMode);

  if (!imageUrl) {
    return null;
  }

  return (
    <div
      aria-label="Loaded preview"
      className="h-full w-full bg-white"
      style={{
        backgroundImage: `url("${imageUrl}")`,
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: sourceMode === 'website-url' ? 'cover' : fitMode,
      }}
    />
  );
}

function DesktopChrome() {
  const frame = useStore((state) => state.frame);
  const title = frame.showTitle ? frame.windowTitle : '';
  const isDark = frame.darkMode;
  const isWindows = frame.desktopChromePreset === 'win';
  const toolbarClass = isDark
    ? 'border-white/5 bg-[#09111d] text-slate-300'
    : 'border-slate-200/80 bg-white text-slate-500';
  const showToolbar = frame.desktopChromePreset !== 'none';
  const titleClass = isDark
    ? 'bg-white/8 text-slate-300/78'
    : 'bg-slate-100/92 text-slate-500';

  return (
    <div
      className={cn('overflow-hidden border border-black/8', isDark ? 'bg-[#09111d]' : 'bg-white')}
      style={{
        width: frame.windowWidth,
        borderRadius: frame.windowRadius,
        ...shadowStyleMap[frame.windowShadow],
      }}
    >
      {showToolbar && (
        <div
          className={cn(
            'relative flex h-11 items-center border-b px-4',
            isWindows ? 'justify-between' : 'justify-start',
            toolbarClass,
          )}
        >
          <div className={cn('flex items-center gap-2', isWindows ? 'min-w-8' : 'min-w-16')}>
            {frame.desktopChromePreset === 'mac' && (
              <>
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2f]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </>
            )}
            {frame.desktopChromePreset === 'win' && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-current/40" aria-hidden="true">
                <path d="M1 1h4v4H1V1zm6 0h4v4H7V1zM1 7h4v4H1V7zm6 0h4v4H7V7z" fill="currentColor" />
              </svg>
            )}
            {frame.desktopChromePreset === 'minimal' && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Mockup</span>
            )}
          </div>

          {isWindows ? (
            <div className="min-w-0 flex-1 px-4">
              <div className="truncate text-center text-xs font-medium text-current/72">{title}</div>
            </div>
          ) : (
            <div className="absolute left-0 right-0 flex justify-center px-16">
              <div className={cn('max-w-[62%] truncate rounded-full px-4 py-1 text-xs font-medium backdrop-blur', titleClass)}>
                {title}
              </div>
            </div>
          )}

          {isWindows && (
            <div className="ml-auto flex items-center gap-0 text-current/60">
              <div className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-current/5">
                <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="10" height="1" fill="currentColor" />
                </svg>
              </div>
              <div className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-current/5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" />
                </svg>
              </div>
              <div className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-red-500 hover:text-white">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden bg-white" style={{ height: frame.windowHeight }}>
        <PreviewImage />
      </div>
    </div>
  );
}

function DeviceFrame() {
  const frame = useStore((state) => state.frame);
  const metrics = getDeviceMetrics(frame);

  return (
    <div
      className="relative border border-black/10 bg-[#0f1520]"
      style={{
        padding: metrics.bezel,
        borderRadius: metrics.outerRadius,
        ...shadowStyleMap[frame.windowShadow],
      }}
    >
      <div
        className="overflow-hidden border border-white/10 bg-white"
        style={{
          width: frame.windowWidth,
          height: frame.windowHeight,
          borderRadius: metrics.innerRadius,
        }}
      >
        <PreviewImage />
      </div>
    </div>
  );
}

export function BrowserWindow() {
  const family = useStore((state) => state.frame.family);

  return family === 'desktop-browser' ? <DesktopChrome /> : <DeviceFrame />;
}
