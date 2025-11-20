import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { useStore } from '@/store/useStore';

export function DownloadButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [format, setFormat] = useState<'png' | 'jpeg'>('png');
    const { windowTitle } = useStore();

    const handleDownload = async () => {
        const node = document.getElementById('fremit-preview');
        if (!node) return;

        setIsLoading(true);
        try {
            // Wait longer for images and fonts to load/render fully
            await new Promise(resolve => setTimeout(resolve, 500));

            const options = {
                quality: 0.95,
                pixelRatio: 2,
                cacheBust: true,
                skipFonts: false,
                filter: (node: HTMLElement) => {
                    // Exclude any elements that might cause issues
                    const exclusions = ['noscript', 'script', 'style'];
                    return !exclusions.includes(node.tagName?.toLowerCase());
                },
            };

            let dataUrl;
            // Render twice to avoid artifacts (common html-to-image issue)
            if (format === 'png') {
                await toPng(node, options); // First pass to warm up
                dataUrl = await toPng(node, options); // Second pass for actual capture
            } else {
                await toJpeg(node, options); // First pass to warm up
                dataUrl = await toJpeg(node, options); // Second pass for actual capture
            }

            // Generate filename from windowTitle
            const sanitized = windowTitle
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');

            const filename = sanitized && sanitized !== 'fremit_app'
                ? `fremit-export_${sanitized}.${format}`
                : `fremit-export.${format}`;

            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export image:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Select value={format} onValueChange={(v: 'png' | 'jpeg') => setFormat(v)}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpeg">JPG</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    className="flex-1 gap-2"
                    onClick={handleDownload}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    Download
                </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Export at 2x resolution (Retina)
            </p>
        </div>
    );
}
