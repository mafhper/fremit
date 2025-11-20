import { Sidebar } from "@/components/editor/Sidebar";
import { PreviewArea } from "@/components/preview/PreviewArea";
import { useImageColors } from "@/hooks/useImageColors";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

export function MainLayout() {
    useImageColors();
    const { appTheme } = useStore();

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (appTheme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(appTheme);
    }, [appTheme]);

    return (
        <div className="flex flex-col lg:flex-row h-screen w-full bg-background text-foreground overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative order-2 lg:order-1">
                <PreviewArea />
            </div>
            <Sidebar className="order-1 lg:order-2" />
        </div>
    );
}
