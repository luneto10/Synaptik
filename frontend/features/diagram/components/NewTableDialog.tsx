"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "../store/diagramStore";

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

    const handleCreate = () => {
        const trimmed = name.trim();
        addTable(trimmed || "new_table");
        setName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-sm">new table</DialogTitle>
                </DialogHeader>

                <Input
                    autoFocus
                    placeholder="table_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="font-mono text-sm"
                />

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
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
