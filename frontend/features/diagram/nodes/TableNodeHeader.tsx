"use client";

import { memo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table2, Link2 } from "lucide-react";
import { useDiagramStore } from "../store/diagramStore";
import { onInputCommit } from "../utils/onInputCommit";

interface TableNodeHeaderProps {
    nodeId: string;
    tableName: string;
    columnCount: number;
    isJunction?: boolean;
}

function TableNodeHeader({ nodeId, tableName, columnCount, isJunction }: TableNodeHeaderProps) {
    const renameTable = useDiagramStore((s) => s.renameTable);
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const commit = () => {
        const val = inputRef.current?.value.trim();
        if (val && val !== tableName) renameTable(nodeId, val);
        inputRef.current?.blur();
        setEditing(false);
    };

    const openRename = () => setEditing(true);

    const headerClass = isJunction
        ? "bg-linear-to-r from-violet-600 to-purple-700"
        : "bg-linear-to-r from-indigo-600 to-indigo-700";
    const iconClass = isJunction ? "w-3.5 h-3.5 text-violet-300 shrink-0" : "w-3.5 h-3.5 text-indigo-300 shrink-0";
    const countClass = isJunction ? "shrink-0 text-[10px] font-medium text-violet-300/80 tabular-nums" : "shrink-0 text-[10px] font-medium text-indigo-300/80 tabular-nums";

    return (
        <div className={`${headerClass} rounded-t-xl px-3 py-2 flex items-center gap-2`}>
            {isJunction
                ? <Link2 className={iconClass} />
                : <Table2 className={iconClass} />
            }
            {isJunction && (
                <span className="text-[9px] font-semibold uppercase tracking-widest text-violet-300/70 shrink-0">
                    junction
                </span>
            )}

            <div className="flex-1 min-w-0">
                {editing ? (
                    <Input
                        ref={inputRef}
                        autoFocus
                        defaultValue={tableName}
                        onBlur={commit}
                        onKeyDown={(e) => onInputCommit(e, { onCommit: commit })}
                        className={`bg-transparent border-0 rounded-none text-white text-sm font-semibold outline-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 w-full font-mono ${isJunction ? "border-b border-violet-300/60" : "border-b border-indigo-300/60"}`}
                    />
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onDoubleClick={openRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "F2") {
                                e.preventDefault();
                                openRename();
                            }
                        }}
                        title="Double-click to rename"
                        aria-label={`Rename table ${tableName}`}
                        className={`text-white font-semibold text-sm p-0 h-auto font-mono hover:bg-transparent truncate max-w-full w-full justify-start ${isJunction ? "hover:text-violet-100" : "hover:text-indigo-100"}`}
                    >
                        {tableName}
                    </Button>
                )}
            </div>

            <span className={countClass}>
                {columnCount}
            </span>
        </div>
    );
}

export default memo(TableNodeHeader);
