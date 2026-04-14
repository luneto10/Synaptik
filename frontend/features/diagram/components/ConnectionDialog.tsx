"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, TableProperties, KeyRound } from "lucide-react";
import type { Connection } from "@xyflow/react";
import type { RelationEdgeData } from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";

type RelationshipType = RelationEdgeData["relationshipType"];

interface ConnectionDialogProps {
    open: boolean;
    connection: Connection | null;
    onConfirm: (
        type: RelationshipType,
        fkName: string,
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

    const sourcePk = useMemo(
        () => sourceNode?.data.columns.find((c) => c.isPrimaryKey),
        [sourceNode],
    );

    const defaultFkName = useMemo(
        () => sourceNode ? `${sourceNode.data.name.toLowerCase()}_id` : "",
        [sourceNode],
    );

    const [relType, setRelType] = useState<RelationshipType>("one-to-many");
    const [fkName, setFkName] = useState(defaultFkName);
    const [createJunction, setCreateJunction] = useState(false);

    // Reset state whenever the dialog opens with a new connection
    useEffect(() => {
        if (open) {
            setRelType("one-to-many");
            setFkName(defaultFkName);
            setCreateJunction(false);
        }
    }, [open, defaultFkName]);

    const isMany = relType === "many-to-many";

    const handleConfirm = () => {
        onConfirm(relType, fkName.trim() || defaultFkName, isMany && createJunction);
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

                {/* Table route header */}
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
                        onValueChange={(v) => v && setRelType(v as RelationshipType)}
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

                {/* FK column name — shown for 1:1 and 1:N only */}
                {!isMany && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            Foreign key column name
                            <span className="ml-1 text-muted-foreground/60">(in {targetNode.data.name})</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            {sourcePk && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-1 shrink-0">
                                    <KeyRound className="w-3 h-3 text-amber-500" />
                                    <span className="font-mono">{sourcePk.name}</span>
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            )}
                            <Input
                                value={fkName}
                                onChange={(e) => setFkName(e.target.value)}
                                placeholder={defaultFkName}
                                className="h-8 text-xs font-mono"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            A <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">FK</Badge> column will be auto-created in{" "}
                            <span className="font-mono">{targetNode.data.name}</span>.
                            Deleting this relation removes the column.
                        </p>
                    </div>
                )}

                {/* M:N — junction table option */}
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
                                        {sourceNode.data.name}_{targetNode.data.name}
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
                    >
                        Create relation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
