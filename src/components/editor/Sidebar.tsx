import { cn } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";
import { WindowControls } from "./WindowControls";
import { BackgroundControls } from "./BackgroundControls";
import { DownloadButton } from "./DownloadButton";
import { useStore } from "@/store/useStore";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui";
import iconSvg from '/icon.svg?url';

export function Sidebar({ className }: { className?: string }) {
  const { appTheme, setConfig } = useStore();

  return (
    <aside className={cn("w-full lg:w-[400px] h-auto max-h-[50vh] lg:max-h-full lg:h-full bg-card dark:bg-[#02040a] border-t lg:border-t-0 lg:border-l overflow-y-auto", className)}>
      <div className="sticky top-0 bg-card dark:bg-[#02040a] border-b p-6 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={iconSvg} alt="Fremit Icon" className="w-8 h-8" />
          <div>
            <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent leading-none">Fremit</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-1">Browser mockups</p>
          </div>
        </div>

        {/* Theme Toggle - Discreet */}
        <div className="flex bg-muted/50 rounded-full p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 rounded-full", appTheme === 'light' && "bg-background shadow-sm text-primary")}
            onClick={() => setConfig({ appTheme: 'light' })}
            title="Light"
          >
            <Sun className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 rounded-full", appTheme === 'system' && "bg-background shadow-sm text-primary")}
            onClick={() => setConfig({ appTheme: 'system' })}
            title="System"
          >
            <Monitor className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 rounded-full", appTheme === 'dark' && "bg-background shadow-sm text-primary")}
            onClick={() => setConfig({ appTheme: 'dark' })}
            title="Dark"
          >
            <Moon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <h2 className="font-semibold text-lg mb-4">Content</h2>
        <ImageUpload />
      </div>

      <div className="h-px bg-border" />

      <div className="p-6">
        <h2 className="font-semibold text-lg mb-4">Window</h2>
        <WindowControls />
      </div>

      <div className="h-px bg-border" />

      <div className="p-6">
        <h2 className="font-semibold text-lg mb-4">Background</h2>
        <BackgroundControls />
      </div>

      <div className="h-px bg-border" />

      <div className="p-6">
        <h2 className="font-semibold text-lg mb-4">Export</h2>
        <DownloadButton />
      </div>
    </aside>
  );
}
