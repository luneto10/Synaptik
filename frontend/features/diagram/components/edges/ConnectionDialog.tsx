"use client";

import { useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, TableProperties, KeyRound } from "lucide-react";
import type { Connection } from "@xyflow/react";
import type { RelationshipType, TableNode } from "../../types/flow.types";
import { isTableNode } from "../../types/flow.types";
import { useDiagramStore } from "../../store/diagramStore";
import { RelationTypePicker } from "./RelationTypePicker";
import { defaultFkColumnName } from "../../store/helpers";

interface ConnectionDialogProps {
    open: boolean;
    connection: Connection | null;
    onConfirm: (type: RelationshipType, fkName: string, createJunction: boolean) => void;
    onCancel: () => void;
}

type ConnectionDialogFormProps = {
    sourceNode: TableNode;
    targetNode: TableNode;
    defaultFkName: string;
    onConfirm: (type: RelationshipType, fkName: string, createJunction: boolean) => void;
    onCancel: () => void;
};

function ConnectionDialogForm({
    sourceNode,
    targetNode,
    defaultFkName,
    onConfirm,
    onCancel,
}: ConnectionDialogFormProps) {
    const sourcePk = useMemo(
        () => sourceNode.data.columns.find((c) => c.isPrimaryKey),
        [sourceNode],
    );

    const [relType, setRelType] = useState<RelationshipType>("one-to-many");
    const [fkName, setFkName] = useState(defaultFkName);
    const [createJunction, setCreateJunction] = useState(false);

    const isMany = relType === "many-to-many";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(relType, fkName.trim() || defaultFkName, isMany && createJunction);
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-indigo-400" />
                    Define relationship
                </DialogTitle>
            </DialogHeader>

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <span className="font-mono font-semibold text-foreground">{sourceNode.data.name}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span className="font-mono font-semibold text-foreground">{targetNode.data.name}</span>
            </div>

            <form onSubmit={handleSubmit} className="contents">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Relationship type</Label>
                    <RelationTypePicker
                        value={relType}
                        onValueChange={(v) => v && setRelType(v as RelationshipType)}
                        withHints
                    />
                </div>

                <Separator />

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
                                autoFocus
                                placeholder={defaultFkName}
                                className="h-8 text-xs font-mono"
                                value={fkName}
                                onChange={(e) => setFkName(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            A{" "}
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">FK</Badge>{" "}
                            column will be auto-created in{" "}
                            <span className="font-mono">{targetNode.data.name}</span>.
                            Deleting this relation removes the column.
                        </p>
                    </div>
                )}

                {isMany && (
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-indigo-400">Auto-create junction table</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Creates{" "}
                                    <span className="font-mono">{sourceNode.data.name}_{targetNode.data.name}</span>{" "}
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
                    <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Create relation
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}

export default function ConnectionDialog({
    open,
    connection,
    onConfirm,
    onCancel,
}: ConnectionDialogProps) {
    const nodes = useDiagramStore((s) => s.nodes);

    const sourceNode = useMemo<TableNode | undefined>(() => {
        const n = nodes.find((n) => n.id === connection?.source);
        return n && isTableNode(n) ? n : undefined;
    }, [nodes, connection?.source]);
    const targetNode = useMemo<TableNode | undefined>(() => {
        const n = nodes.find((n) => n.id === connection?.target);
        return n && isTableNode(n) ? n : undefined;
    }, [nodes, connection?.target]);
    const defaultFkName = sourceNode ? defaultFkColumnName(sourceNode.data.name) : "";

    if (!connection || !sourceNode || !targetNode) return null;

    const formKey = `${connection.source}-${connection.target}-${defaultFkName}`;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent className="sm:max-w-sm">
                {open && (
                    <ConnectionDialogForm
                        key={formKey}
                        sourceNode={sourceNode}
                        targetNode={targetNode}
                        defaultFkName={defaultFkName}
                        onConfirm={onConfirm}
                        onCancel={onCancel}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
