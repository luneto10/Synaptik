"use client";

import { useState, memo, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "../store/diagramStore";
import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureDeferred,
} from "../store/diagramHistory";

interface BoxNodeEditorProps {
    nodeId: string;
    title: string;
    color: string;
    opacity: number;
}

const PRESETS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#0ea5e9", "#64748b", "#1e293b", "#ffffff",
];

export const BoxNodeEditor = memo(function BoxNodeEditor({ 
    nodeId, 
    title, 
    color, 
    opacity 
}: BoxNodeEditorProps) {
    const updateBox = useDiagramStore((s) => s.updateBox);
    const [open, setOpen] = useState(false);

    const onTitleChange = useCallback((next: string) => {
        updateBox(nodeId, { title: next });
    }, [nodeId, updateBox]);

    const onColorChange = useCallback((next: string) => {
        updateBox(nodeId, { color: next });
    }, [nodeId, updateBox]);

    const onOpacityChange = useCallback((next: number) => {
        updateBox(nodeId, { opacity: next });
    }, [nodeId, updateBox]);

    const startGesture = useCallback(() => beginDiagramHistoryGesture(), []);
    const endGesture = useCallback(() => endDiagramHistoryGestureDeferred(), []);

    return (
        <div
            className="flex items-center gap-1.5 rounded-lg bg-card border border-border shadow-md px-1.5 py-1"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onFocus={startGesture}
                onBlur={endGesture}
                placeholder="Untitled category"
                className="h-7 w-40 text-xs border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Change color"
                    >
                        <span
                            className="w-4 h-4 rounded-full border border-border/60 shadow-inner"
                            style={{ backgroundColor: color }}
                        />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    align="end"
                    className="w-[236px] p-3"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        onPointerDown={startGesture}
                        onPointerUp={endGesture}
                        onPointerCancel={endGesture}
                        className="flex justify-center"
                    >
                        <HexColorPicker color={color} onChange={onColorChange} />
                    </div>

                    <div className="mt-3 flex items-center gap-1 flex-wrap">
                        {PRESETS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => onColorChange(c)}
                                className="w-5 h-5 rounded-full border border-border/60 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c }}
                                aria-label={`Pick ${c}`}
                            />
                        ))}
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Opacity
                            </Label>
                            <span className="text-xs font-mono text-muted-foreground">
                                {Math.round(opacity * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={opacity}
                            onChange={(e) => onOpacityChange(Number(e.target.value))}
                            onPointerDown={startGesture}
                            onPointerUp={endGesture}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-muted"
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
});
