import { useCallback, useEffect, useRef, useState } from "react";
import { useDiagramStore } from "../store/diagramStore";
import { isTableNode } from "../types/flow.types";
import { onInputCommitAndBlur } from "../utils/onInputCommit";
import { hasDuplicateTableName } from "../utils/nameValidation";
import { useValidatedField } from "./useValidatedField";

export function useTableNodeHeaderRename(nodeId: string, tableName: string) {
    const renameTable = useDiagramStore((s) => s.renameTable);
    const inputRef = useRef<HTMLInputElement>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(tableName);
    const { error, clearError, failValidation, setError } =
        useValidatedField<HTMLInputElement>();
    const errorId = `${nodeId}-table-name-error`;

    const openRename = useCallback(() => {
        clearError();
        setDraft(tableName);
        setEditing(true);
    }, [clearError, tableName]);

    useEffect(() => {
        if (!editing) return;
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.select();
    }, [editing]);

    const commit = useCallback((): "applied" | "blocked" => {
        const next = draft.trim();
        if (!next || next === tableName) {
            setDraft(tableName);
            setError(null);
            setEditing(false);
            return "applied";
        }
        const nodes = useDiagramStore.getState().nodes.filter(isTableNode);
        if (hasDuplicateTableName(nodes, next, nodeId)) {
            failValidation(
                "A table with this name already exists.",
                inputRef.current,
            );
            return "blocked";
        }
        setError(null);
        renameTable(nodeId, next);
        setEditing(false);
        return "applied";
    }, [
        draft,
        failValidation,
        nodeId,
        renameTable,
        setError,
        tableName,
    ]);

    const cancelRename = useCallback(() => {
        setDraft(tableName);
        clearError();
        setEditing(false);
    }, [clearError, tableName]);

    const handleDraftChange = useCallback(
        (value: string) => {
            setDraft(value);
            if (error) clearError();
        },
        [clearError, error],
    );

    const handleNameKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            onInputCommitAndBlur(e, {
                onCommit: () => commit() === "applied",
                onCancel: cancelRename,
            });
            e.stopPropagation();
        },
        [cancelRename, commit],
    );

    const displayNameKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "Enter" && e.key !== "F2") return;
            e.preventDefault();
            e.stopPropagation();
            openRename();
        },
        [openRename],
    );

    const commitOnBlur = useCallback(() => {
        void commit();
    }, [commit]);

    return {
        editing,
        draft,
        inputRef,
        error,
        errorId,
        openRename,
        displayNameKeyDown,
        handleDraftChange,
        handleNameKeyDown,
        commitOnBlur,
    };
}
