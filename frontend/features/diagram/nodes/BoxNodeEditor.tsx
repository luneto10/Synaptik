"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useShallow } from "zustand/shallow";
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
import { useRafThrottle } from "../utils/useRafThrottle";
import { normalizeHex } from "../utils/color";
import { hasDuplicateCategoryTitle } from "../utils/nameValidation";
import { isBoxNode } from "../types/flow.types";
import InlineFieldError from "../components/common/InlineFieldError";
import { onInputCommitAndBlur } from "../utils/onInputCommit";

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
    opacity,
}: BoxNodeEditorProps) {
    const updateBox = useDiagramStore((s) => s.updateBox);
    const boxes = useDiagramStore(
        useShallow((s) => s.nodes.filter(isBoxNode)),
    );
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [titleFocused, setTitleFocused] = useState(false);

    const [draftColor, setDraftColor] = useState(color);
    const [draftOpacity, setDraftOpacity] = useState(opacity);
    const [draftTitle, setDraftTitle] = useState(title);

    useEffect(() => {
        if (!isDragging) {
            setDraftColor(color);
            setDraftOpacity(opacity);
        }
        if (!titleFocused) {
            setDraftTitle(title);
        }
    }, [color, opacity, title, isDragging, titleFocused]);

    const commitColor = useRafThrottle((next: string) => {
        updateBox(nodeId, { color: next });
    });
    const commitOpacity = useRafThrottle((next: number) => {
        updateBox(nodeId, { opacity: next });
    });

    const commitTitle = useCallback(() => {
        const next = draftTitle.trim();
        if (!next || next === title) {
            setDraftTitle(title);
            setError(null);
            return;
        }

        const isDuplicate = hasDuplicateCategoryTitle(boxes, next, nodeId);
        if (isDuplicate) {
            setError("Duplicate category title.");
            return;
        }

        setError(null);
        updateBox(nodeId, { title: next });
        setDraftTitle(next);
    }, [draftTitle, title, nodeId, updateBox, boxes]);

    const onColorChange = useCallback(
        (next: string) => {
            setDraftColor(next);
            commitColor(next);
        },
        [commitColor],
    );

    const onOpacityChange = useCallback(
        (next: number) => {
            setDraftOpacity(next);
            commitOpacity(next);
        },
        [commitOpacity],
    );

    const startDrag = useCallback(() => {
        setIsDragging(true);
        beginDiagramHistoryGesture();
    }, []);
    const endDrag = useCallback(() => {
        setIsDragging(false);
        endDiagramHistoryGestureDeferred();
    }, []);

    // Hex input: double-click the swatch label to type the value directly.
    const [editingHex, setEditingHex] = useState(false);
    const [hexDraft, setHexDraft] = useState(draftColor);
    const hexInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!editingHex) {
            setHexDraft(draftColor);
        }
    }, [draftColor, editingHex]);

    useEffect(() => {
        if (editingHex) {
            hexInputRef.current?.focus();
            hexInputRef.current?.select();
        }
    }, [editingHex]);

    const commitHex = useCallback(() => {
        const next = normalizeHex(hexDraft);
        if (next) {
            setDraftColor(next);
            updateBox(nodeId, { color: next });
        } else {
            setHexDraft(draftColor);
        }
        setEditingHex(false);
    }, [hexDraft, draftColor, nodeId, updateBox]);

    return (
        <div
            className="flex flex-col gap-0.5 rounded-lg bg-card border border-border shadow-md p-1 min-w-[240px]"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-1.5 px-0.5">
                <div className="flex-1">
                    <Input
                        value={draftTitle}
                        onChange={(e) => {
                            setDraftTitle(e.target.value);
                            if (error) setError(null);
                        }}
                        onFocus={() => {
                            setTitleFocused(true);
                            beginDiagramHistoryGesture();
                        }}
                        onBlur={() => {
                            setTitleFocused(false);
                            commitTitle();
                            endDiagramHistoryGestureDeferred();
                        }}
                        onKeyDown={(e) =>
                            onInputCommitAndBlur(e, {
                                onCommit: () => {
                                    commitTitle();
                                    return true;
                                },
                                onCancel: () => {
                                    setDraftTitle(title);
                                    setError(null);
                                    return true;
                                },
                            })
                        }
                        placeholder="Untitled category"
                        className="h-8 w-64 text-base font-semibold border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    />
                    <InlineFieldError
                        message={error}
                        compact
                        className="px-1"
                    />
                </div>

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
                            onPointerDown={startDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
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
                                    onChange={(e) => setHexDraft(e.target.value)}
                                    onBlur={commitHex}
                                    onKeyDown={(e) =>
                                        onInputCommitAndBlur(e, {
                                            onCommit: () => {
                                                commitHex();
                                                return true;
                                            },
                                            onCancel: () => {
                                            setHexDraft(draftColor);
                                            setEditingHex(false);
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
                                    onDoubleClick={() => setEditingHex(true)}
                                    className="text-xs font-mono uppercase text-muted-foreground hover:text-foreground transition-colors select-text cursor-text"
                                    title="Double-click to edit"
                                >
                                    {draftColor.toUpperCase()}
                                </button>
                            )}
                        </div>

                        <div className="mt-2 flex items-center gap-1 flex-wrap">
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
                                onPointerDown={startDrag}
                                onPointerUp={endDrag}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-muted"
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
});
