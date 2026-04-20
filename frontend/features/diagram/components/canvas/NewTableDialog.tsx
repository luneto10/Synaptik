"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "../../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../../store/diagramHistory";
import { onInputCommit } from "../../utils/onInputCommit";
import InlineFieldError from "../common/InlineFieldError";
import {
    hasDuplicateTableName,
    refocusAndSelect,
} from "../../utils/nameValidation";
import { isTableNode } from "../../types/flow.types";

interface NewTableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function NewTableDialog({
    open,
    onOpenChange,
}: NewTableDialogProps) {
    const addTable = useDiagramStore((s) => s.addTable);
    const { screenToFlowPosition } = useReactFlow();
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const errorId = "new-table-name-error";

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setName("");
            setError(null);
        }
        onOpenChange(nextOpen);
    };

    const handleCreate = () => {
        const trimmed = name.trim();
        const nextName = trimmed || "new_table";
        const nodes = useDiagramStore.getState().nodes.filter(isTableNode);
        if (hasDuplicateTableName(nodes, nextName)) {
            setError("A table with this name already exists.");
            refocusAndSelect(inputRef.current);
            return;
        }

        endDiagramHistoryGestureIfActive();
        // Spawn the new table near the current viewport center
        const position = screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
        addTable(nextName, position);
        handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-sm">new table</DialogTitle>
                </DialogHeader>

                <Input
                    ref={inputRef}
                    placeholder="table_name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={(e) =>
                        onInputCommit(e, {
                            onCommit: handleCreate,
                            onCancel: () => handleOpenChange(false),
                        })
                    }
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className="font-mono text-sm"
                />
                <InlineFieldError id={errorId} message={error} />

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
                    >
                        cancel
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleCreate}
                    >
                        create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
