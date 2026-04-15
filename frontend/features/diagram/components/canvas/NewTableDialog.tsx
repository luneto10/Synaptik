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
import { useDiagramStore } from "../../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../../store/diagramHistory";
import { onInputCommit } from "../../utils/onInputCommit";

interface NewTableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function NewTableDialog({
    open,
    onOpenChange,
}: NewTableDialogProps) {
    const addTable = useDiagramStore((s) => s.addTable);
    const [name, setName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) setName("");
        onOpenChange(nextOpen);
    };

    const handleCreate = () => {
        const trimmed = name.trim();
        endDiagramHistoryGestureIfActive();
        addTable(trimmed || "new_table");
        setName("");
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
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) =>
                        onInputCommit(e, {
                            onCommit: handleCreate,
                            onCancel: () => handleOpenChange(false),
                        })
                    }
                    className="font-mono text-sm"
                />

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
