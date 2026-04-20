"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table2, Link2 } from "lucide-react";
import { useTableNodeHeaderRename } from "../hooks/useTableNodeHeaderRename";
import InlineFieldError from "../components/common/InlineFieldError";

interface TableNodeHeaderProps {
    nodeId: string;
    tableName: string;
    columnCount: number;
    isJunction?: boolean;
}

function TableNodeHeader({ nodeId, tableName, columnCount, isJunction }: TableNodeHeaderProps) {
    const {
        editing,
        draft,
        inputRef,
        error,
        errorId,
        openRename,
        displayNameKeyDown,
        handleDraftChange,
        handleNameKeyDown,
        commitOnBlur,
    } = useTableNodeHeaderRename(nodeId, tableName);

    const headerClass = isJunction
        ? "bg-linear-to-r from-violet-600 to-purple-700"
        : "bg-linear-to-r from-indigo-600 to-indigo-700";
    const iconClass = isJunction
        ? "w-3.5 h-3.5 text-violet-300 shrink-0"
        : "w-3.5 h-3.5 text-indigo-300 shrink-0";
    const countClass = isJunction
        ? "shrink-0 text-[10px] font-medium text-violet-300/80 tabular-nums"
        : "shrink-0 text-[10px] font-medium text-indigo-300/80 tabular-nums";
    const inputUnderline = isJunction
        ? "border-b border-violet-300/60"
        : "border-b border-indigo-300/60";
    const buttonHover = isJunction ? "hover:text-violet-100" : "hover:text-indigo-100";

    return (
        <div className={`${headerClass} rounded-t-xl px-3 py-2 flex items-center gap-2`}>
            {isJunction ? (
                <Link2 className={iconClass} />
            ) : (
                <Table2 className={iconClass} />
            )}
            {isJunction && (
                <span className="text-[9px] font-semibold uppercase tracking-widest text-violet-300/70 shrink-0">
                    junction
                </span>
            )}

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {editing ? (
                    <Input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        onBlur={commitOnBlur}
                        onKeyDown={handleNameKeyDown}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className={`nodrag bg-transparent border-0 rounded-none text-white text-sm font-semibold outline-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 w-full font-mono ${inputUnderline}`}
                    />
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onDoubleClick={openRename}
                        onKeyDown={displayNameKeyDown}
                        title="Double-click to rename"
                        aria-label={`Rename table ${tableName}`}
                        className={`text-white font-semibold text-sm p-0 h-auto font-mono hover:bg-transparent truncate max-w-full w-full justify-start ${buttonHover}`}
                    >
                        {tableName}
                    </Button>
                )}
                <InlineFieldError
                    id={errorId}
                    message={error}
                    compact
                    className="max-w-[200px] text-amber-100"
                />
            </div>

            <span className={countClass}>{columnCount}</span>
        </div>
    );
}

export default memo(TableNodeHeader);
