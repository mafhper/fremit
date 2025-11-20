import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

export function BrowserWindow() {
    const {
        windowType,
        windowShadow,
        windowRadius,
        darkMode,
        showTitle,
        windowTitle,
        imageUrl,
        imageScale
    } = useStore();

    const shadowStyle = {
        none: {},
        sm: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)' },
        md: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25)' },
        lg: { boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), 0 8px 16px rgba(0, 0, 0, 0.3)' },
        xl: { boxShadow: '0 24px 56px rgba(0, 0, 0, 0.55), 0 12px 24px rgba(0, 0, 0, 0.4)' },
        '2xl': { boxShadow: '0 32px 72px rgba(0, 0, 0, 0.65), 0 16px 32px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.35)' },
    }[windowShadow];

    return (
        <div
            className={cn(
                "relative transition-all duration-300 ease-in-out overflow-hidden",
                darkMode ? "bg-gray-900" : "bg-white"
            )}
            style={{
                borderRadius: windowRadius,
                width: 'fit-content',
                maxWidth: '100%',
                maxHeight: '100%',
                ...shadowStyle,
            }}
        >
            {/* Title Bar */}
            {(windowType !== 'none') && (
                <div className={cn(
                    "flex items-center px-4 h-10 gap-4 select-none relative",
                    darkMode ? "bg-gray-800/50" : "bg-gray-100/50"
                )}>
                    {/* Mac Controls (Left) */}
                    {windowType === 'mac' && (
                        <div className="flex gap-2 min-w-[60px] z-10">
                            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                        </div>
                    )}

                    {/* Spacer for Windows (Left) */}
                    {windowType === 'win' && <div className="min-w-[100px]" />}

                    {/* Title */}
                    {showTitle && (
                        <div className={cn(
                            "flex-1 text-center text-xs font-medium truncate z-0 absolute inset-0 flex items-center justify-center pointer-events-none",
                            darkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                            {windowTitle}
                        </div>
                    )}

                    {/* Spacer for Mac (Right) */}
                    {windowType === 'mac' && <div className="min-w-[60px]" />}

                    {/* Windows Controls (Right) */}
                    {windowType === 'win' && (
                        <div className="flex h-full items-center ml-auto z-10 -mr-4">
                            <div className={cn("h-full w-[46px] flex items-center justify-center transition-colors", darkMode ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-black/10 text-gray-600 hover:text-black")}>
                                <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
                                    <path d="M0 0h10v1H0z" />
                                </svg>
                            </div>
                            <div className={cn("h-full w-[46px] flex items-center justify-center transition-colors", darkMode ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-black/10 text-gray-600 hover:text-black")}>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                                    <rect x="0.5" y="0.5" width="9" height="9" />
                                </svg>
                            </div>
                            <div className={cn("h-full w-[46px] flex items-center justify-center transition-colors hover:bg-[#E81123] hover:text-white", darkMode ? "text-gray-400" : "text-gray-600")}>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                    <path d="M0.5 0.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="relative overflow-hidden bg-white" style={{
                width: 'min(90vw, 800px)',
                height: 'auto',
                aspectRatio: '16/10',
                maxHeight: 'min(65vh, 600px)',
            }}>
                {imageUrl ? (
                    <img
                        crossOrigin="anonymous"
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-contain transition-transform duration-300"
                        style={{ transform: `scale(${imageScale})` }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                        <div className="text-center p-8">
                            <p>No image loaded</p>
                            <p className="text-xs mt-2">Drag & drop or paste an URL</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
