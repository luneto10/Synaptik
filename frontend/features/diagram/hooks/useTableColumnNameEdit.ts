import { useCallback, useEffect, useRef, useState } from "react";
import type { DbColumn } from "../types/db.types";
import { onInputCommitAndBlur } from "../utils/onInputCommit";
import { useValidatedField } from "./useValidatedField";

type CommitSource = "blur" | "enter";

interface Params {
    column: DbColumn;
    hasDuplicateName: (candidate: string, excludeColumnId: string) => boolean;
    autoFocus?: boolean;
    onFocusConsumed?: () => void;
    onUpdate: (column: DbColumn) => void;
    onRemove: (colId: string) => void;
}

export function useTableColumnNameEdit({
    column,
    hasDuplicateName,
    autoFocus,
    onFocusConsumed,
    onUpdate,
    onRemove,
}: Params) {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const isFreshColumnRef = useRef(Boolean(autoFocus));
    const [draftName, setDraftName] = useState(column.name);
    const [editing, setEditing] = useState(Boolean(autoFocus));
    const { error, clearError, failValidation, setError } =
        useValidatedField<HTMLInputElement>();

    const errorId = `${column.id}-name-error`;

    useEffect(() => {
        if (editing && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
            if (autoFocus) onFocusConsumed?.();
        }
    }, [autoFocus, editing, onFocusConsumed]);

    const openEditor = useCallback(() => {
        clearError();
        setDraftName(column.name);
        setEditing(true);
    }, [clearError, column.name]);

    const commitName = useCallback(
        (source: CommitSource): "applied" | "blocked" => {
            const next = draftName.trim();
            if (!next || next === column.name) {
                setDraftName(column.name);
                setError(null);
                setEditing(false);
                return "applied";
            }
            const duplicate = hasDuplicateName(next, column.id);
            if (duplicate) {
                if (isFreshColumnRef.current && source === "blur") {
                    onRemove(column.id);
                    return "blocked";
                }
                failValidation("Duplicate column name.", nameInputRef.current);
                return "blocked";
            }
            setError(null);
            onUpdate({ ...column, name: next });
            isFreshColumnRef.current = false;
            setEditing(false);
            return "applied";
        },
        [
            column,
            draftName,
            failValidation,
            hasDuplicateName,
            onRemove,
            onUpdate,
            setError,
        ],
    );

    const cancelName = useCallback(() => {
        if (
            isFreshColumnRef.current &&
            hasDuplicateName(draftName, column.id)
        ) {
            onRemove(column.id);
            return;
        }
        setDraftName(column.name);
        clearError();
        setEditing(false);
    }, [
        clearError,
        column.id,
        column.name,
        draftName,
        hasDuplicateName,
        onRemove,
    ]);

    const handleDraftChange = useCallback(
        (value: string) => {
            setDraftName(value);
            if (error) clearError();
        },
        [clearError, error],
    );

    const handleNameKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            onInputCommitAndBlur(e, {
                onCommit: () => commitName("enter") === "applied",
                onCancel: cancelName,
            });
            e.stopPropagation();
        },
        [cancelName, commitName],
    );

    const displayNameKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "Enter" && e.key !== "F2") return;
            e.preventDefault();
            e.stopPropagation();
            openEditor();
        },
        [openEditor],
    );

    const commitNameOnBlur = useCallback(
        () => commitName("blur"),
        [commitName],
    );

    return {
        nameInputRef,
        editing,
        draftName,
        error,
        errorId,
        openEditor,
        commitNameOnBlur,
        handleDraftChange,
        handleNameKeyDown,
        displayNameKeyDown,
    };
}
