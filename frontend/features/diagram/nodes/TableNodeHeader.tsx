"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDiagramStore } from "../store/diagramStore";

interface TableNodeHeaderProps {
    nodeId: string;
    tableName: string;
    columnCount: number;
}

export default function TableNodeHeader({
    nodeId,
    tableName,
    columnCount,
}: TableNodeHeaderProps) {
    const renameTable = useDiagramStore((s) => s.renameTable);
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const commit = () => {
        const val = inputRef.current?.value.trim();
        if (val && val !== tableName) renameTable(nodeId, val);
        inputRef.current?.blur();
        setEditing(false);
    };

    return (
        <div className="bg-indigo-600 rounded-t-xl px-3 py-2 flex items-center justify-between gap-2">
            {/* ── Name / Edit input ── */}
            {editing ? (
                <Input
                    ref={inputRef}
                    autoFocus
                    defaultValue={tableName}
                    onBlur={commit}
                    onKeyDown={(e) => e.key === "Enter" && commit()}
                    className="bg-transparent border-0 border-b border-indigo-300 rounded-none
                     text-white text-sm font-semibold outline-none p-0 h-auto
                     focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                />
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onDoubleClick={() => setEditing(true)}
                    title="Double-click to rename"
                    className="text-white font-semibold text-sm p-0 h-auto
                     hover:bg-transparent hover:text-indigo-100
                     truncate max-w-full"
                >
                    {tableName}
                </Button>
            )}

            {/* ── Column count badge ── */}
            <Badge
                variant="secondary"
                className="bg-indigo-500 text-indigo-100 hover:bg-indigo-500 text-xs shrink-0"
            >
                {columnCount} col{columnCount !== 1 ? "s" : ""}
            </Badge>
        </div>
    );
}
