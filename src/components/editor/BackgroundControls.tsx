import { useStore, type BackgroundType } from "@/store/useStore";
import { Label, Slider, Tabs, TabsList, TabsTrigger } from "@/components/ui";

const GRADIENTS = [
    'linear-gradient(to right, #8e2de2, #4a00e0)',
    'linear-gradient(to right, #ff512f, #dd2476)',
    'linear-gradient(to right, #4facfe, #00f2fe)',
    'linear-gradient(to right, #43e97b, #38f9d7)',
    'linear-gradient(to right, #fa709a, #fee140)',
    'linear-gradient(to right, #667eea, #764ba2)',
];

const SOLID_COLORS = [
    '#ffffff',
    '#f3f4f6',
    '#e5e7eb',
    '#d1d5db',
    '#9ca3af',
    '#4b5563',
    '#1f2937',
    '#000000',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#d946ef',
    '#f43f5e',
];

export function BackgroundControls() {
    const {
        bgType,
        bgColor,
        bgGradient,
        bgGradientType,
        bgGradientDirection,
        padding,
        setConfig
    } = useStore();

    // Effect to update gradient string when type or direction changes
    // We need to extract current colors first
    const updateGradient = (type: 'linear' | 'radial', direction: number) => {
        const parts = bgGradient.match(/#[a-fA-F0-9]{6}/g) || ['#ffffff', '#000000'];
        const start = parts[0];
        const end = parts[1] || parts[0]; // Fallback if only one color found

        const newGradient = type === 'linear'
            ? `linear-gradient(${direction}deg, ${start}, ${end})`
            : `radial-gradient(circle, ${start}, ${end})`;

        setConfig({ bgGradient: newGradient, bgGradientType: type, bgGradientDirection: direction });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Background Type</Label>
                <Tabs value={bgType} onValueChange={(v: string) => setConfig({ bgType: v as BackgroundType })}>
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="solid">Solid</TabsTrigger>
                        <TabsTrigger value="gradient">Gradient</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {bgType === 'solid' && (
                <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="grid grid-cols-6 gap-2">
                        {SOLID_COLORS.map((c) => (
                            <button
                                key={c}
                                className={`w-8 h-8 rounded-full border transition-transform hover:scale-110 ${bgColor === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setConfig({ bgColor: c })}
                            />
                        ))}
                        <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setConfig({ bgColor: e.target.value })}
                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                        />
                    </div>
                </div>
            )}

            {bgType === 'gradient' && (
                <div className="space-y-4">
                    <Label>Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {GRADIENTS.map((g) => (
                            <button
                                key={g}
                                className={`h-12 rounded-md transition-transform hover:scale-105 ${bgGradient === g ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                style={{ background: g }}
                                onClick={() => setConfig({ bgGradient: g })}
                            />
                        ))}
                    </div>

                    <div className="space-y-4 pt-2 border-t">
                        <Label>Custom Gradient</Label>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <Tabs value={bgGradientType || 'linear'} onValueChange={(v) => updateGradient(v as 'linear' | 'radial', bgGradientDirection)}>
                                    <TabsList className="w-full">
                                        <TabsTrigger value="linear" className="flex-1">Linear</TabsTrigger>
                                        <TabsTrigger value="radial" className="flex-1">Radial</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                            {bgGradientType === 'linear' && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Angle ({bgGradientDirection}°)</Label>
                                    <Slider
                                        value={[bgGradientDirection]}
                                        min={0}
                                        max={360}
                                        step={15}
                                        onValueChange={([v]) => updateGradient('linear', v)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs text-muted-foreground">Start Color</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="w-full h-8 rounded cursor-pointer"
                                        onChange={(e) => {
                                            const start = e.target.value;
                                            const parts = bgGradient.match(/#[a-fA-F0-9]{6}/g) || ['#ffffff', '#000000'];
                                            const end = parts[1] || '#000000';

                                            const newGradient = bgGradientType === 'linear'
                                                ? `linear-gradient(${bgGradientDirection}deg, ${start}, ${end})`
                                                : `radial-gradient(circle, ${start}, ${end})`;
                                            setConfig({ bgGradient: newGradient });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs text-muted-foreground">End Color</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="w-full h-8 rounded cursor-pointer"
                                        onChange={(e) => {
                                            const end = e.target.value;
                                            const parts = bgGradient.match(/#[a-fA-F0-9]{6}/g) || ['#ffffff', '#000000'];
                                            const start = parts[0] || '#ffffff';

                                            const newGradient = bgGradientType === 'linear'
                                                ? `linear-gradient(${bgGradientDirection}deg, ${start}, ${end})`
                                                : `radial-gradient(circle, ${start}, ${end})`;
                                            setConfig({ bgGradient: newGradient });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <div className="flex justify-between">
                    <Label>Padding</Label>
                    <span className="text-xs text-muted-foreground">{padding}px</span>
                </div>
                <Slider
                    value={[padding]}
                    min={0}
                    max={128}
                    step={4}
                    onValueChange={([v]: number[]) => setConfig({ padding: v })}
                />
            </div>
        </div>
    );
}
