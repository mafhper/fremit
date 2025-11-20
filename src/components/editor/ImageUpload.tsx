import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { getProxiedUrl, cn } from '@/lib/utils';

// Helper to generate a descriptive title from URL
function getUrlTitle(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.replace(/^\/$/, '').replace(/\/$/, '');
        return pathname ? `${urlObj.hostname}${pathname}` : urlObj.hostname;
    } catch {
        return 'Image';
    }
}

export function ImageUpload() {
    const { setImage, setConfig } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
            // Reset title when uploading new image
            setConfig({ windowTitle: file.name });
        };
        reader.readAsDataURL(file);
    }, [setImage, setConfig]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput) return;

        setIsLoading(true);
        try {
            // Check if it's likely an image URL
            const isImage = urlInput.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null;

            if (isImage) {
                const proxiedUrl = getProxiedUrl(urlInput);
                setImage(proxiedUrl);
                setConfig({ windowTitle: urlInput.split('/').pop() || 'Image' });
            } else {
                // Try to fetch metadata via microlink.io with screenshot for better preview
                try {
                    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(urlInput)}&screenshot=true&meta=false`);
                    const data = await response.json();

                    if (data.status === 'success' && data.data) {
                        const { screenshot, image, title } = data.data;

                        // Prefer screenshot over OG image (screenshot shows actual page, not just logo)
                        if (screenshot && screenshot.url) {
                            setImage(getProxiedUrl(screenshot.url));
                            setConfig({ windowTitle: title || getUrlTitle(urlInput) });
                        } else if (image && image.url) {
                            setImage(getProxiedUrl(image.url));
                            setConfig({ windowTitle: title || getUrlTitle(urlInput) });
                        } else {
                            // Fallback if no image found in metadata
                            setImage(getProxiedUrl(urlInput));
                            setConfig({ windowTitle: getUrlTitle(urlInput) });
                        }
                    } else {
                        throw new Error("Failed to fetch metadata");
                    }
                } catch (err) {
                    console.warn("Failed to fetch OG data, falling back to direct URL", err);
                    setImage(getProxiedUrl(urlInput));
                    setConfig({ windowTitle: getUrlTitle(urlInput) });
                }
            }
        } catch (error) {
            console.error("Error loading URL:", error);
        } finally {
            setIsLoading(false);
            // Clear input after processing (success or failure) to allow new URL
            setUrlInput('');
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm font-medium">Click or drop image</p>
                </div>
            </div>

            <form onSubmit={handleUrlSubmit} className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Paste URL..."
                    className="w-full bg-background border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </form>
        </div>
    );
}
