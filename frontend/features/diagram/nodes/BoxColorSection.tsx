"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoxOpacitySection } from "./BoxOpacitySection";
import { HexColorPicker } from "react-colorful";
import { onInputCommitAndBlur } from "../utils/onInputCommit";

interface BoxColorSectionProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draftColor: string;
    editingHex: boolean;
    hexDraft: string;
    hexInputRef: React.RefObject<HTMLInputElement | null>;
    presets: string[];
    onColorChange: (next: string) => void;
    onHexDraftChange: (next: string) => void;
    onStartGesture: () => void;
    onEndGesture: () => void;
    onStartHexEdit: () => void;
    onCommitHex: () => void;
    onCancelHex: () => void;
    draftOpacity: number;
    onOpacityChange: (next: number) => void;
}

export function BoxColorSection({
    open,
    onOpenChange,
    draftColor,
    editingHex,
    hexDraft,
    hexInputRef,
    presets,
    onColorChange,
    onHexDraftChange,
    onStartGesture,
    onEndGesture,
    onStartHexEdit,
    onCommitHex,
    onCancelHex,
    draftOpacity,
    onOpacityChange,
}: BoxColorSectionProps) {
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label="Change color"
                >
                    <span
                        className="w-4 h-4 rounded-full border border-border/60 shadow-inner"
                        style={{ backgroundColor: draftColor }}
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
                    onPointerDown={onStartGesture}
                    onPointerUp={onEndGesture}
                    onPointerCancel={onEndGesture}
                    className="flex justify-center"
                >
                    <HexColorPicker color={draftColor} onChange={onColorChange} />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Hex
                    </span>
                    {editingHex ? (
                        <Input
                            ref={hexInputRef}
                            value={hexDraft}
                            onChange={(e) => onHexDraftChange(e.target.value)}
                            onBlur={onCommitHex}
                            onKeyDown={(e) =>
                                onInputCommitAndBlur(e, {
                                    onCommit: () => {
                                        onCommitHex();
                                        return true;
                                    },
                                    onCancel: () => {
                                        onCancelHex();
                                        return true;
                                    },
                                })
                            }
                            spellCheck={false}
                            maxLength={7}
                            className="h-6 w-[92px] text-xs font-mono uppercase px-1.5"
                        />
                    ) : (
                        <button
                            type="button"
                            onDoubleClick={onStartHexEdit}
                            className="text-xs font-mono uppercase text-muted-foreground hover:text-foreground transition-colors select-text cursor-text"
                            title="Double-click to edit"
                        >
                            {draftColor.toUpperCase()}
                        </button>
                    )}
                </div>

                <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {presets.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onColorChange(color)}
                            className="w-5 h-5 rounded-full border border-border/60 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            aria-label={`Pick ${color}`}
                        />
                    ))}
                </div>

                <BoxOpacitySection
                    draftOpacity={draftOpacity}
                    onOpacityChange={onOpacityChange}
                    onStartGesture={onStartGesture}
                    onEndGesture={onEndGesture}
                />
            </PopoverContent>
        </Popover>
    );
}
