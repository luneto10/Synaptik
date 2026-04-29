"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { KeyRound } from "lucide-react";
import type { DbColumn } from "../types/db.types";
import type { TableNode } from "../types/flow.types";

interface ColumnSettingsFkReferenceSectionProps {
    column: DbColumn;
    nodeId: string;
    otherNodes: TableNode[];
    refPk: DbColumn | undefined;
    onRetarget: (nodeId: string, colId: string, tableId: string) => void;
}

export function ColumnSettingsFkReferenceSection({
    column,
    nodeId,
    otherNodes,
    refPk,
    onRetarget,
}: ColumnSettingsFkReferenceSectionProps) {
    return (
        <div className="space-y-2 border-t border-border pt-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                References
            </p>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Table</Label>
                <Select
                    value={column.references?.tableId ?? ""}
                    onValueChange={(newTableId) =>
                        onRetarget(nodeId, column.id, newTableId)
                    }
                >
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select table..." />
                    </SelectTrigger>
                    <SelectContent>
                        {otherNodes.map((node) => (
                            <SelectItem
                                key={node.id}
                                value={node.id}
                                className="text-xs font-mono"
                            >
                                {node.data.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {refPk && (
                <Badge className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3 shrink-0 text-amber-500" />
                    <div className="font-mono">{refPk.name}</div>
                </Badge>
            )}
        </div>
    );
}
