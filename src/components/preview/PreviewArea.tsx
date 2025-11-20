import { cn } from "@/lib/utils";
import { BrowserWindow } from "./BrowserWindow";
import { useStore } from "@/store/useStore";

export function PreviewArea({ className }: { className?: string }) {
    const { bgType, bgColor, bgGradient, bgImage, padding } = useStore();

    const backgroundStyle = bgType === 'solid' ? {
        backgroundColor: bgColor,
    } : bgType === 'gradient' ? {
        backgroundImage: bgGradient,
    } : bgImage ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    } : {};

    return (
        <main className={cn("flex-1 h-full overflow-hidden flex items-center justify-center p-4 md:p-8 bg-gray-50 dark:bg-background/50", className)}>
            <div
                id="fremit-preview"
                className="transition-all duration-300 ease-in-out flex items-center justify-center"
                style={{
                    ...backgroundStyle,
                    padding: `${padding}px`,
                }}
            >
                <BrowserWindow />
            </div>
        </main>
    );
}
