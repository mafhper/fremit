import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { devicePresetLabels, viewportPresetLabels } from '@/lib/framePresets';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/i18n/useI18n';
import type { DesktopChromePreset, DevicePreset, ShadowSize, ViewportPreset } from '@/types/app';

const fieldClass =
  'h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

const surfaceClass = 'surface-muted flex items-center justify-between rounded-2xl border px-4 py-3';

export function FrameControls() {
  const { copy } = useI18n();
  const frame = useStore((state) => state.frame);
  const setFrameFamily = useStore((state) => state.setFrameFamily);
  const setDesktopChromePreset = useStore((state) => state.setDesktopChromePreset);
  const setDevicePreset = useStore((state) => state.setDevicePreset);
  const setOrientation = useStore((state) => state.setOrientation);
  const setViewportPreset = useStore((state) => state.setViewportPreset);
  const setCustomViewport = useStore((state) => state.setCustomViewport);
  const updateFrame = useStore((state) => state.updateFrame);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{copy.controls.frameFamily}</Label>
        <Tabs value={frame.family} onValueChange={(value) => setFrameFamily(value as 'desktop-browser' | 'device-frame')}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted">
            <TabsTrigger value="desktop-browser" className="rounded-xl">
              {copy.controls.desktop}
            </TabsTrigger>
            <TabsTrigger value="device-frame" className="rounded-xl">
              {copy.controls.mobileTablet}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {frame.family === 'desktop-browser' ? (
        <>
          <div className="space-y-2">
            <Label>{copy.controls.chromePreset}</Label>
            <Select
              value={frame.desktopChromePreset}
              onValueChange={(value) => setDesktopChromePreset(value as DesktopChromePreset)}
            >
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder={copy.controls.chromePreset} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mac">macOS</SelectItem>
                <SelectItem value="win">Windows</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={surfaceClass}>
              <Label>{copy.controls.darkChrome}</Label>
              <Switch checked={frame.darkMode} onCheckedChange={(checked) => updateFrame({ darkMode: checked })} />
            </div>
            <div className={surfaceClass}>
              <Label>{copy.controls.showTitle}</Label>
              <Switch checked={frame.showTitle} onCheckedChange={(checked) => updateFrame({ showTitle: checked })} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>{copy.controls.devicePreset}</Label>
            <Select value={frame.devicePreset} onValueChange={(value) => setDevicePreset(value as DevicePreset)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder={copy.controls.devicePreset} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(devicePresetLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{copy.controls.orientation}</Label>
            <Tabs value={frame.orientation} onValueChange={(value) => setOrientation(value as 'portrait' | 'landscape')}>
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted">
                <TabsTrigger value="portrait" className="rounded-xl">
                  {copy.controls.portrait}
                </TabsTrigger>
                <TabsTrigger value="landscape" className="rounded-xl">
                  {copy.controls.landscape}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

        </>
      )}

      <div className="space-y-2">
        <Label>{copy.controls.viewportPreset}</Label>
        <Select value={frame.viewportPreset} onValueChange={(value) => setViewportPreset(value as ViewportPreset)}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder={copy.controls.viewportPreset} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(viewportPresetLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {frame.viewportPreset === 'custom' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{copy.controls.width}</Label>
            <input
              type="number"
              className={fieldClass}
              value={frame.windowWidth}
              onChange={(event) => setCustomViewport('width', Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>{copy.controls.height}</Label>
            <input
              type="number"
              className={fieldClass}
              value={frame.windowHeight}
              onChange={(event) => setCustomViewport('height', Number(event.target.value))}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{copy.controls.imageFit}</Label>
        <Select value={frame.fitMode} onValueChange={(value) => updateFrame({ fitMode: value as 'contain' | 'cover' })}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder={copy.controls.imageFit} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="cover">Cover</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{copy.controls.shadow}</Label>
        <Select value={frame.windowShadow} onValueChange={(value) => updateFrame({ windowShadow: value as ShadowSize })}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder={copy.controls.shadow} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
            <SelectItem value="xl">Extra large</SelectItem>
            <SelectItem value="2xl">Huge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>{copy.controls.cornerRadius}</Label>
          <span className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">{frame.windowRadius}px</span>
        </div>
        <Slider
          value={[frame.windowRadius]}
          min={8}
          max={42}
          step={1}
          onValueChange={([value]) => updateFrame({ windowRadius: value })}
        />
      </div>

      {frame.family === 'desktop-browser' && frame.showTitle && (
        <div className="space-y-2">
          <Label>{copy.controls.windowTitle}</Label>
          <input
            type="text"
            className={fieldClass}
            value={frame.windowTitle}
            onChange={(event) => updateFrame({ windowTitle: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export { FrameControls as WindowControls };
