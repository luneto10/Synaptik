"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RelationEdgeData } from "../types/flow.types";

type RelationshipType = RelationEdgeData["relationshipType"];

interface RelationTypeDialogProps {
    open: boolean;
    onConfirm: (type: RelationshipType) => void;
    onCancel: () => void;
}

const OPTIONS: {
    value: RelationshipType;
    label: string;
    description: string;
}[] = [
    { value: "one-to-one", label: "1 : 1", description: "One to One" },
    { value: "one-to-many", label: "1 : N", description: "One to Many" },
    {
        value: "many-to-many",
        label: "N : M",
        description: "Many to Many",
    },
];

export default function RelationTypeDialog({
    open,
    onConfirm,
    onCancel,
}: RelationTypeDialogProps) {
    const [selected, setSelected] = useState<RelationshipType>("one-to-many");

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Relationship type
                    </DialogTitle>
                </DialogHeader>

                <ToggleGroup
                    type="single"
                    value={selected}
                    onValueChange={(v) =>
                        v && setSelected(v as RelationshipType)
                    }
                    className="flex flex-col gap-2 w-full"
                >
                    {OPTIONS.map((opt) => (
                        <ToggleGroupItem
                            key={opt.value}
                            value={opt.value}
                            className="w-full h-12 flex flex-col justify-center data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400 data-[state=on]:border-indigo-500 border rounded-lg"
                        >
                            <span className="font-mono font-bold text-sm">
                                {opt.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {opt.description}
                            </span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => onConfirm(selected)}
                    >
                        Create relation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
