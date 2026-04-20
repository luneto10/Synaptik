"use client";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface BoxOpacitySectionProps {
    draftOpacity: number;
    onOpacityChange: (next: number) => void;
    onStartGesture: () => void;
    onEndGesture: () => void;
}

export function BoxOpacitySection({
    draftOpacity,
    onOpacityChange,
    onStartGesture,
    onEndGesture,
}: BoxOpacitySectionProps) {
    return (
        <>
            <Separator className="my-3" />

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Opacity
                    </Label>
                    <span className="text-xs font-mono text-muted-foreground">
                        {Math.round(draftOpacity * 100)}%
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={draftOpacity}
                    onChange={(e) => onOpacityChange(Number(e.target.value))}
                    onPointerDown={onStartGesture}
                    onPointerUp={onEndGesture}
                    onPointerCancel={onEndGesture}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-muted"
                />
            </div>
        </>
    );
}
