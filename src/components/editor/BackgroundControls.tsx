import { Label, Slider, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';
import type { BackgroundType } from '@/types/app';

const gradients = [
  'linear-gradient(135deg, #f7f0e7 0%, #cfe2df 52%, #f2d3b1 100%)',
  'linear-gradient(140deg, #f6d365 0%, #fda085 45%, #ef476f 100%)',
  'linear-gradient(135deg, #1f3b73 0%, #4ea8de 48%, #f6bd60 100%)',
  'linear-gradient(135deg, #0f172a 0%, #334155 42%, #a855f7 100%)',
  'linear-gradient(135deg, #dce35b 0%, #45b649 45%, #0f766e 100%)',
  'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 50%, #60a5fa 100%)',
];

const solids = ['#faf4ea', '#f4efe8', '#edf2f2', '#dce9ea', '#d7dde8', '#ffffff', '#16202a', '#0b1320'];

export function BackgroundControls() {
  const { copy } = useI18n();
  const background = useStore((state) => state.background);
  const updateBackground = useStore((state) => state.updateBackground);

  const updateGradient = (type: 'linear' | 'radial', direction: number) => {
    const parts = background.bgGradient.match(/#[a-fA-F0-9]{6}/g) || ['#faf4ea', '#1e847f'];
    const start = parts[0];
    const end = parts[1] || parts[0];
    const nextGradient =
      type === 'linear'
        ? `linear-gradient(${direction}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`;

    updateBackground({
      bgGradient: nextGradient,
      bgGradientType: type,
      bgGradientDirection: direction,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{copy.controls.backgroundType}</Label>
        <Tabs value={background.bgType} onValueChange={(value) => updateBackground({ bgType: value as BackgroundType })}>
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted">
            <TabsTrigger value="solid" className="rounded-xl">
              {copy.controls.solid}
            </TabsTrigger>
            <TabsTrigger value="gradient" className="rounded-xl">
              {copy.controls.gradient}
            </TabsTrigger>
            <TabsTrigger value="image" className="rounded-xl">
              {copy.controls.image}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {background.bgType === 'solid' && (
        <div className="space-y-3">
          <Label>{copy.controls.palette}</Label>
          <div className="grid grid-cols-4 gap-3">
            {solids.map((color) => (
              <button
                key={color}
                type="button"
                className="h-11 rounded-2xl border border-black/5 transition hover:scale-[1.03]"
                style={{ backgroundColor: color }}
                onClick={() => updateBackground({ bgColor: color })}
              />
            ))}
          </div>
        </div>
      )}

      {background.bgType === 'gradient' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>{copy.controls.gradientPresets}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {gradients.map((gradient) => (
                <button
                  key={gradient}
                  type="button"
                  className="h-16 rounded-[1.25rem] border border-black/5 transition hover:scale-[1.02]"
                  style={{ backgroundImage: gradient }}
                  onClick={() => updateBackground({ bgGradient: gradient })}
                />
              ))}
            </div>
          </div>

          <div className="surface-muted space-y-4 rounded-[1.5rem] border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">{copy.controls.type}</Label>
                <Tabs
                  value={background.bgGradientType}
                  onValueChange={(value) => updateGradient(value as 'linear' | 'radial', background.bgGradientDirection)}
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted">
                    <TabsTrigger value="linear" className="rounded-xl">
                      Linear
                    </TabsTrigger>
                    <TabsTrigger value="radial" className="rounded-xl">
                      Radial
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {background.bgGradientType === 'linear' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">{copy.controls.angle}</Label>
                    <span className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
                      {background.bgGradientDirection}°
                    </span>
                  </div>
                  <Slider
                    value={[background.bgGradientDirection]}
                    min={0}
                    max={360}
                    step={15}
                    onValueChange={([value]) => updateGradient('linear', value)}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">{copy.controls.start}</span>
                <input
                  type="color"
                  className="h-11 w-full rounded-2xl border border-input bg-background p-1"
                  onChange={(event) => {
                    const start = event.target.value;
                    const parts = background.bgGradient.match(/#[a-fA-F0-9]{6}/g) || ['#faf4ea', '#1e847f'];
                    const end = parts[1] || '#1e847f';
                    updateBackground({
                      bgGradient:
                        background.bgGradientType === 'linear'
                          ? `linear-gradient(${background.bgGradientDirection}deg, ${start}, ${end})`
                          : `radial-gradient(circle, ${start}, ${end})`,
                    });
                  }}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">{copy.controls.end}</span>
                <input
                  type="color"
                  className="h-11 w-full rounded-2xl border border-input bg-background p-1"
                  onChange={(event) => {
                    const end = event.target.value;
                    const parts = background.bgGradient.match(/#[a-fA-F0-9]{6}/g) || ['#faf4ea', '#1e847f'];
                    const start = parts[0] || '#faf4ea';
                    updateBackground({
                      bgGradient:
                        background.bgGradientType === 'linear'
                          ? `linear-gradient(${background.bgGradientDirection}deg, ${start}, ${end})`
                          : `radial-gradient(circle, ${start}, ${end})`,
                    });
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {background.bgType === 'image' && (
        <div className="space-y-3">
          <Label>{copy.controls.backgroundImageUrl}</Label>
          <input
            type="text"
            placeholder={copy.controls.backgroundImagePlaceholder}
            className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={background.bgImage ?? ''}
            onChange={(event) => updateBackground({ bgImage: event.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>{copy.controls.canvasPadding}</Label>
          <span className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">{background.padding}px</span>
        </div>
        <Slider
          value={[background.padding]}
          min={16}
          max={128}
          step={4}
          onValueChange={([value]) => updateBackground({ padding: value })}
        />
      </div>
    </div>
  );
}
