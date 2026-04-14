"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { DbColumn } from "../types/db.types";
import TableNodeColumnRow from "./TableNodeColumnRow";

interface TableNodeColumnsProps {
    nodeId: string;
    columns: DbColumn[];
    onUpdate: (column: DbColumn) => void;
    onRemove: (columnId: string) => void;
}

export default function TableNodeColumns({
    nodeId,
    columns,
    onUpdate,
    onRemove,
}: TableNodeColumnsProps) {
    return (
        <>
            <Separator />
            <ScrollArea className="max-h-80">
                <div className="flex flex-col">
                    {/* ── Column header ── */}
                    <div className="flex items-center bg-muted/40 border-b border-border/50 text-xs text-muted-foreground select-none">
                        <div className="w-10 px-2 py-1.5 shrink-0" />
                        <div className="flex-1 px-1 py-1.5">name</div>
                        <div className="w-24 px-1 py-1.5 shrink-0">type</div>
                        <div className="w-14 px-1 py-1.5 shrink-0" />
                    </div>

                    {/* ── Column rows ── */}
                    {columns.map((col) => (
                        <TableNodeColumnRow
                            key={col.id}
                            nodeId={nodeId}
                            column={col}
                            onUpdate={onUpdate}
                            onRemove={() => onRemove(col.id)}
                        />
                    ))}
                </div>
            </ScrollArea>
        </>
    );
}
