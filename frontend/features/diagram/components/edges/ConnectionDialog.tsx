"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { DbColumn } from "../../types/db.types";
import { useDiagramStore } from "../../store/diagramStore";
import { RelationTypePicker } from "./RelationTypePicker";
import { defaultFkColumnName } from "../../store/helpers";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
    relType: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
    fkName: z.string(),
    createJunction: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConnectionDialogProps {
    open: boolean;
    connection: Connection | null;
    onConfirm: (type: RelationshipType, fkName: string, createJunction: boolean) => void;
    onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConnectionDialog({
    open,
    connection,
    onConfirm,
    onCancel,
}: ConnectionDialogProps) {
    // Derived from store — not form fields
    const [sourceNode, setSourceNode] = useState<TableNode | undefined>();
    const [targetNode, setTargetNode] = useState<TableNode | undefined>();
    const [sourcePk,   setSourcePk]   = useState<DbColumn | undefined>();
    const [defaultFkName, setDefaultFkName] = useState("");

    const { control, register, handleSubmit, watch, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { relType: "one-to-many", fkName: "", createJunction: false },
    });

    // Populate derived state + reset form each time the dialog opens
    useEffect(() => {
        if (!open) return;
        const { nodes } = useDiagramStore.getState();
        const src = nodes.find((n) => n.id === connection?.source);
        const tgt = nodes.find((n) => n.id === connection?.target);
        const pk  = src?.data.columns.find((c) => c.isPrimaryKey);
        const fk  = src ? defaultFkColumnName(src.data.name) : "";

        setSourceNode(src);
        setTargetNode(tgt);
        setSourcePk(pk);
        setDefaultFkName(fk);
        reset({ relType: "one-to-many", fkName: fk, createJunction: false });
    }, [open, connection?.source, connection?.target, reset]);

    const relType = watch("relType");
    const isMany  = relType === "many-to-many";

    const onSubmit = ({ relType, fkName, createJunction }: FormData) => {
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
                    <span className="font-mono font-semibold text-foreground">{sourceNode.data.name}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                    <span className="font-mono font-semibold text-foreground">{targetNode.data.name}</span>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="contents">
                    {/* Relationship type */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Relationship type</Label>
                        <Controller
                            control={control}
                            name="relType"
                            render={({ field }) => (
                                <RelationTypePicker
                                    value={field.value}
                                    onValueChange={(v) => v && field.onChange(v)}
                                    withHints
                                />
                            )}
                        />
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
                                    autoFocus
                                    placeholder={defaultFkName}
                                    className="h-8 text-xs font-mono"
                                    {...register("fkName")}
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

                    {/* M:N — junction table option */}
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
                                <Controller
                                    control={control}
                                    name="createJunction"
                                    render={({ field }) => (
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    )}
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
            </DialogContent>
        </Dialog>
    );
}
