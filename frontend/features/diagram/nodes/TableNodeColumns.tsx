"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { DbColumn } from "../types/db.types";
import TableNodeColumnRow from "./TableNodeColumnRow";

interface TableNodeColumnsProps {
    nodeId: string;
    columns: DbColumn[];
    focusColId: string | null;
    onFocusConsumed: () => void;
    onUpdate: (column: DbColumn) => void;
    onRemove: (columnId: string) => void;
}

export default function TableNodeColumns({
    nodeId,
    columns,
    focusColId,
    onFocusConsumed,
    onUpdate,
    onRemove,
}: TableNodeColumnsProps) {
    return (
        <>
            <Separator />
            <ScrollArea className="max-h-80">
                <div className="flex flex-col">
                    {columns.map((col) => (
                        <TableNodeColumnRow
                            key={col.id}
                            nodeId={nodeId}
                            column={col}
                            autoFocus={col.id === focusColId}
                            onFocusConsumed={onFocusConsumed}
                            onUpdate={onUpdate}
                            onRemove={() => onRemove(col.id)}
                        />
                    ))}
                </div>
            </ScrollArea>
        </>
    );
}
