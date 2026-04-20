"use client";

import { memo } from "react";
import { BoxTitleField } from "./BoxTitleField";
import { BoxColorSection } from "./BoxColorSection";
import { useBoxNodeEditorState } from "../hooks/useBoxNodeEditorState";

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
    const editor = useBoxNodeEditorState({ nodeId, title, color, opacity });

    return (
        <div
            className="flex flex-col gap-0.5 rounded-lg bg-card border border-border shadow-md p-1 min-w-[240px]"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-1.5 px-0.5">
                <BoxTitleField
                    draftTitle={editor.draftTitle}
                    error={editor.error}
                    onTitleChange={(next) => {
                        editor.setDraftTitle(next);
                        if (editor.error) editor.setError(null);
                    }}
                    onFocus={editor.beginGesture}
                    onBlur={() => {
                        editor.commitTitle();
                        editor.endGesture();
                    }}
                    onCommit={editor.commitTitle}
                    onCancel={editor.cancelTitle}
                />

                <BoxColorSection
                    open={editor.open}
                    onOpenChange={editor.setOpen}
                    draftColor={editor.draftColor}
                    editingHex={editor.editingHex}
                    hexDraft={editor.hexDraft}
                    hexInputRef={editor.hexInputRef}
                    presets={PRESETS}
                    onColorChange={editor.onColorChange}
                    onHexDraftChange={editor.setHexDraft}
                    onStartGesture={editor.beginGesture}
                    onEndGesture={editor.endGesture}
                    onStartHexEdit={editor.startHexEdit}
                    onCommitHex={editor.commitHex}
                    onCancelHex={editor.cancelHex}
                    draftOpacity={editor.draftOpacity}
                    onOpacityChange={editor.onOpacityChange}
                />
            </div>
        </div>
    );
});
