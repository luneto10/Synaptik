"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, TableProperties } from "lucide-react";
import type { Connection } from "@xyflow/react";
import type { RelationEdgeData } from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";

type RelationshipType = RelationEdgeData["relationshipType"];

interface ConnectionDialogProps {
    open: boolean;
    connection: Connection | null;
    onConfirm: (
        type: RelationshipType,
        sourceColId: string,
        targetColId: string,
        createJunction: boolean,
    ) => void;
    onCancel: () => void;
}

const RELATION_OPTIONS: {
    value: RelationshipType;
    label: string;
    hint: string;
}[] = [
    { value: "one-to-one",   label: "1 : 1", hint: "One to One" },
    { value: "one-to-many",  label: "1 : N", hint: "One to Many" },
    { value: "many-to-many", label: "N : M", hint: "Many to Many" },
];

export default function ConnectionDialog({
    open,
    connection,
    onConfirm,
    onCancel,
}: ConnectionDialogProps) {
    const nodes = useDiagramStore((s) => s.nodes);

    const sourceNode = useMemo(
        () => nodes.find((n) => n.id === connection?.source),
        [nodes, connection?.source],
    );
    const targetNode = useMemo(
        () => nodes.find((n) => n.id === connection?.target),
        [nodes, connection?.target],
    );

    // Pre-fill from handle IDs if the user dragged from a column handle
    const inferredSourceColId =
        connection?.sourceHandle?.replace("-source", "") ?? "";
    const inferredTargetColId =
        connection?.targetHandle?.replace("-target", "") ?? "";

    const [relType, setRelType] = useState<RelationshipType>("one-to-many");
    const [sourceColId, setSourceColId] = useState(inferredSourceColId);
    const [targetColId, setTargetColId] = useState(inferredTargetColId);
    const [createJunction, setCreateJunction] = useState(false);

    const isMany = relType === "many-to-many";
    const canConfirm = !!sourceColId && !!targetColId;

    const handleConfirm = () => {
        onConfirm(relType, sourceColId, targetColId, isMany && createJunction);
    };

    if (!sourceNode || !targetNode) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                        <TableProperties className="w-4 h-4 text-indigo-400" />
                        Define relationship
                    </DialogTitle>
                </DialogHeader>

                {/* Table header */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    <span className="font-mono font-semibold text-foreground">
                        {sourceNode.data.name}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                    <span className="font-mono font-semibold text-foreground">
                        {targetNode.data.name}
                    </span>
                </div>

                {/* Relationship type */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        Relationship type
                    </Label>
                    <ToggleGroup
                        type="single"
                        value={relType}
                        onValueChange={(v) =>
                            v && setRelType(v as RelationshipType)
                        }
                        className="grid grid-cols-3 gap-1"
                    >
                        {RELATION_OPTIONS.map((opt) => (
                            <ToggleGroupItem
                                key={opt.value}
                                value={opt.value}
                                className="flex flex-col h-14 data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400 data-[state=on]:border-indigo-500 border rounded-lg"
                            >
                                <span className="font-mono font-bold text-sm">
                                    {opt.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {opt.hint}
                                </span>
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                <Separator />

                {/* Column selection */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Source column */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            From column
                        </Label>
                        <Select
                            value={sourceColId}
                            onValueChange={setSourceColId}
                        >
                            <SelectTrigger className="h-8 text-xs font-mono">
                                <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                                {sourceNode.data.columns.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id}
                                        className="text-xs font-mono"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {c.name}
                                            {c.isPrimaryKey && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] px-1 py-0 h-4 text-amber-500 border-amber-500/30"
                                                >
                                                    PK
                                                </Badge>
                                            )}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Target column */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            To column
                        </Label>
                        <Select
                            value={targetColId}
                            onValueChange={setTargetColId}
                        >
                            <SelectTrigger className="h-8 text-xs font-mono">
                                <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                                {targetNode.data.columns.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id}
                                        className="text-xs font-mono"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {c.name}
                                            {c.isPrimaryKey && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] px-1 py-0 h-4 text-amber-500 border-amber-500/30"
                                                >
                                                    PK
                                                </Badge>
                                            )}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* M:N junction table option */}
                {isMany && (
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-indigo-400">
                                    Auto-create junction table
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Creates{" "}
                                    <span className="font-mono">
                                        {sourceNode.data.name}_
                                        {targetNode.data.name}
                                    </span>{" "}
                                    with FK columns to both tables
                                </p>
                            </div>
                            <Switch
                                checked={createJunction}
                                onCheckedChange={setCreateJunction}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                    >
                        Create relation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
