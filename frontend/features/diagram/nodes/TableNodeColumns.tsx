"use client";

import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        <ScrollArea className="max-h-72">
            <Table>
                {/* ── Header ── */}
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-10 px-2 py-1 text-[10px] text-slate-400"></TableHead>
                        <TableHead className="px-2 py-1 text-[10px] text-slate-400">
                            name
                        </TableHead>
                        <TableHead className="px-2 py-1 text-[10px] text-slate-400">
                            type
                        </TableHead>
                        <TableHead className="w-8 px-2 py-1 text-[10px] text-slate-400">
                            null
                        </TableHead>
                        <TableHead className="w-6 px-1 py-1" />
                    </TableRow>
                </TableHeader>

                {/* ── Rows ── */}
                <TableBody>
                    {columns.map((col) => (
                        <TableNodeColumnRow
                            key={col.id}
                            column={col}
                            onUpdate={onUpdate}
                            onRemove={() => onRemove(col.id)}
                        />
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
