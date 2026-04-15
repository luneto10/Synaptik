"use client";

import { memo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table2 } from "lucide-react";
import { useDiagramStore } from "../store/diagramStore";
import { onInputCommit } from "../utils/onInputCommit";

interface TableNodeHeaderProps {
    nodeId: string;
    tableName: string;
    columnCount: number;
}

function TableNodeHeader({ nodeId, tableName, columnCount }: TableNodeHeaderProps) {
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
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-xl px-3 py-2 flex items-center gap-2">
            <Table2 className="w-3.5 h-3.5 text-indigo-300 shrink-0" />

            <div className="flex-1 min-w-0">
                {editing ? (
                    <Input
                        ref={inputRef}
                        autoFocus
                        defaultValue={tableName}
                        onBlur={commit}
                        onKeyDown={(e) => onInputCommit(e, { onCommit: commit })}
                        className="bg-transparent border-0 border-b border-indigo-300/60 rounded-none
                                   text-white text-sm font-semibold outline-none p-0 h-auto
                                   focus-visible:ring-0 focus-visible:ring-offset-0 w-full font-mono"
                    />
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onDoubleClick={() => setEditing(true)}
                        title="Double-click to rename"
                        className="text-white font-semibold text-sm p-0 h-auto font-mono
                                   hover:bg-transparent hover:text-indigo-100
                                   truncate max-w-full w-full justify-start"
                    >
                        {tableName}
                    </Button>
                )}
            </div>

            <span className="shrink-0 text-[10px] font-medium text-indigo-300/80 tabular-nums">
                {columnCount}
            </span>
        </div>
    );
}

export default memo(TableNodeHeader);
