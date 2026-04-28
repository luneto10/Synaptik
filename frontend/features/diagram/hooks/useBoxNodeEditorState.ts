import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useDiagramStore } from "../store/diagramStore";
import { useRafThrottle } from "../utils/useRafThrottle";
import { normalizeHex } from "../utils/color";
import { hasDuplicateCategoryTitle } from "../utils/nameValidation";
import { isBoxNode } from "../types/flow.types";
import { useValidatedField } from "./useValidatedField";
import { useHistoryGestureHandlers } from "./useHistoryGestureHandlers";

interface UseBoxNodeEditorStateArgs {
    nodeId: string;
    title: string;
    color: string;
    opacity: number;
}

export function validateBoxTitle(
    candidate: string,
    currentTitle: string,
    isDuplicate: boolean,
) {
    const next = candidate.trim();
    if (!next || next === currentTitle) {
        return { status: "noop", value: currentTitle } as const;
    }
    if (isDuplicate) {
        return { status: "duplicate" } as const;
    }
    return { status: "apply", value: next } as const;
}

export function useBoxNodeEditorState({
    nodeId,
    title,
    color,
    opacity,
}: UseBoxNodeEditorStateArgs) {
    const boxes = useDiagramStore(useShallow((s) => s.nodes.filter(isBoxNode)));
    const { beginGesture, endGesture } = useHistoryGestureHandlers();

    const [open, setOpen] = useState(false);
    const { error, setError, clearError } = useValidatedField<HTMLInputElement>();
    const [draftColor, setDraftColor] = useState(color);
    const [draftOpacity, setDraftOpacity] = useState(opacity);
    const [draftTitle, setDraftTitle] = useState(title);
    const [editingHex, setEditingHex] = useState(false);
    const [hexDraft, setHexDraft] = useState(color);
    const hexInputRef = useRef<HTMLInputElement>(null);

    const commitColor = useRafThrottle((next: string) => {
        useDiagramStore.getState().updateBox(nodeId,{ color: next });
    });
    const commitOpacity = useRafThrottle((next: number) => {
        useDiagramStore.getState().updateBox(nodeId,{ opacity: next });
    });

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

    const commitTitle = useCallback(() => {
        const duplicate = hasDuplicateCategoryTitle(boxes, draftTitle, nodeId);
        const result = validateBoxTitle(draftTitle, title, duplicate);
        if (result.status === "noop") {
            setDraftTitle(title);
            clearError();
            return;
        }
        if (result.status === "duplicate") {
            setError("Duplicate category title.");
            return;
        }
        clearError();
        useDiagramStore.getState().updateBox(nodeId,{ title: result.value });
        setDraftTitle(result.value);
    }, [boxes, clearError, draftTitle, nodeId, setError, title]);

    const cancelTitle = useCallback(() => {
        setDraftTitle(title);
        clearError();
    }, [clearError, title]);

    const startHexEdit = useCallback(() => {
        setHexDraft(draftColor);
        setEditingHex(true);
    }, [draftColor]);

    const cancelHex = useCallback(() => {
        setHexDraft(draftColor);
        setEditingHex(false);
    }, [draftColor]);

    const commitHex = useCallback(() => {
        const next = normalizeHex(hexDraft);
        if (next) {
            setDraftColor(next);
            useDiagramStore.getState().updateBox(nodeId,{ color: next });
        } else {
            setHexDraft(draftColor);
        }
        setEditingHex(false);
    }, [draftColor, hexDraft, nodeId]);

    useEffect(() => {
        if (!editingHex) return;
        hexInputRef.current?.focus();
        hexInputRef.current?.select();
    }, [editingHex]);

    return {
        open,
        setOpen,
        error,
        setError,
        draftColor,
        draftOpacity,
        draftTitle,
        setDraftTitle,
        editingHex,
        hexDraft,
        setHexDraft,
        hexInputRef,
        onColorChange,
        onOpacityChange,
        beginGesture,
        endGesture,
        commitTitle,
        cancelTitle,
        startHexEdit,
        cancelHex,
        commitHex,
    };
}
