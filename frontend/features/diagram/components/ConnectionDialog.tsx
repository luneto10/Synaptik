"use client";

import { useState, useEffect } from "react";
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
import type { RelationshipType, TableNode } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import { useDiagramStore } from "../store/diagramStore";
import { RELATION_LABELS } from "../constants";

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

const RELATION_OPTIONS: { value: RelationshipType; hint: string }[] = [
    { value: "one-to-one", hint: "One to One" },
    { value: "one-to-many", hint: "One to Many" },
    { value: "many-to-many", hint: "Many to Many" },
];

export default function ConnectionDialog({
    open,
    connection,
    onConfirm,
    onCancel,
}: ConnectionDialogProps) {
    // Read nodes once from store snapshot when dialog opens — avoids subscribing
    // to the full nodes array (which re-renders on every position change).
    const [sourceNode, setSourceNode] = useState<TableNode | undefined>();
    const [targetNode, setTargetNode] = useState<TableNode | undefined>();
    const [sourcePk, setSourcePk] = useState<DbColumn | undefined>();
    const [defaultFkName, setDefaultFkName] = useState("");

    const [relType, setRelType] = useState<RelationshipType>("one-to-many");
    const [fkName, setFkName] = useState("");
    const [createJunction, setCreateJunction] = useState(false);

    useEffect(() => {
        if (!open) return;
        const { nodes } = useDiagramStore.getState();
        const src = nodes.find((n) => n.id === connection?.source);
        const tgt = nodes.find((n) => n.id === connection?.target);
        const pk = src?.data.columns.find((c) => c.isPrimaryKey);
        const fk = src ? `${src.data.name.toLowerCase()}_id` : "";

        setSourceNode(src);
        setTargetNode(tgt);
        setSourcePk(pk);
        setDefaultFkName(fk);

        // Reset form
        setRelType("one-to-many");
        setFkName(fk);
        setCreateJunction(false);
    }, [open, connection?.source, connection?.target]);

    const isMany = relType === "many-to-many";

    const handleConfirm = () => {
        onConfirm(relType, fkName.trim() || defaultFkName, isMany && createJunction);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return;
        if ((e.target as HTMLElement).tagName === "BUTTON") return;
        e.preventDefault();
        handleConfirm();
    };

    if (!sourceNode || !targetNode) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent className="sm:max-w-sm" onKeyDown={handleKeyDown}>
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
                                    {RELATION_LABELS[opt.value]}
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
                            <span className="ml-1 text-muted-foreground/60">
                                (in {targetNode.data.name})
                            </span>
                        </Label>
                        <div className="flex items-center gap-2">
                            {sourcePk && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-1 shrink-0">
                                    <KeyRound className="w-3 h-3 text-amber-500" />
                                    <span className="font-mono">
                                        {sourcePk.name}
                                    </span>
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            )}
                            <Input
                                autoFocus
                                value={fkName}
                                onChange={(e) => setFkName(e.target.value)}
                                placeholder={defaultFkName}
                                className="h-8 text-xs font-mono"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleConfirm();
                                    e.stopPropagation();
                                }}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            A{" "}
                            <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 h-4 font-mono"
                            >
                                FK
                            </Badge>{" "}
                            column will be auto-created in{" "}
                            <span className="font-mono">
                                {targetNode.data.name}
                            </span>
                            . Deleting this relation removes the column.
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
                    >
                        Create relation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
