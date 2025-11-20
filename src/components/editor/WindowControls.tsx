import { useStore, type WindowType, type ShadowSize } from "@/store/useStore";
import { Label, Switch, Slider, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

export function WindowControls() {
    const {
        windowType,
        windowShadow,
        windowRadius,
        darkMode,
        showTitle,
        windowTitle,
        setConfig
    } = useStore();

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Dark Mode</Label>
                    <Switch
                        checked={darkMode}
                        onCheckedChange={(c: boolean) => setConfig({ darkMode: c })}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label>Show Title</Label>
                    <Switch
                        checked={showTitle}
                        onCheckedChange={(c: boolean) => setConfig({ showTitle: c })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Window Type</Label>
                <Select
                    value={windowType}
                    onValueChange={(v: string) => setConfig({ windowType: v as WindowType })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="mac">macOS</SelectItem>
                        <SelectItem value="win">Windows</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Shadow</Label>
                <Select
                    value={windowShadow}
                    onValueChange={(v: string) => setConfig({ windowShadow: v as ShadowSize })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select shadow" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                        <SelectItem value="2xl">Huge</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between">
                    <Label>Border Radius</Label>
                    <span className="text-xs text-muted-foreground">{windowRadius}px</span>
                </div>
                <Slider
                    value={[windowRadius]}
                    min={0}
                    max={24}
                    step={1}
                    onValueChange={([v]: number[]) => setConfig({ windowRadius: v })}
                />
            </div>

            {showTitle && (
                <div className="space-y-2">
                    <Label>Window Title</Label>
                    <input
                        type="text"
                        className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={windowTitle}
                        onChange={(e) => setConfig({ windowTitle: e.target.value })}
                    />
                </div>
            )}
        </div>
    );
}
