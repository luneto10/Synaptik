"use client";

import { memo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    COLUMN_TYPES,
    type DbColumn,
    type ColumnType,
} from "../types/db.types";
import ColumnBadges from "./ColumnBadges";
import ColumnSettingsPopover from "./ColumnSettingsPopover";
import { useTableColumnNameEdit } from "../hooks/useTableColumnNameEdit";
import InlineFieldError from "../components/common/InlineFieldError";

interface Props {
    nodeId: string;
    column: DbColumn;
    hasDuplicateName: (candidate: string, excludeColumnId: string) => boolean;
    autoFocus?: boolean;
    onFocusConsumed?: () => void;
    onUpdate: (column: DbColumn) => void;
    onRemove: (colId: string) => void;
}

function TableNodeColumnRow({
    nodeId,
    column,
    hasDuplicateName,
    autoFocus,
    onFocusConsumed,
    onUpdate,
    onRemove,
}: Props) {
    const [isHovered, setIsHovered] = useState(false);
    const {
        nameInputRef,
        editing,
        draftName,
        error,
        errorId,
        openEditor,
        commitNameOnBlur,
        handleDraftChange,
        handleNameKeyDown,
        displayNameKeyDown,
    } = useTableColumnNameEdit({
        column,
        hasDuplicateName,
        autoFocus,
        onFocusConsumed,
        onUpdate,
        onRemove,
    });

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "group relative flex items-center border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors border-l-2",
                column.isPrimaryKey && "border-l-amber-500/50",
                column.isForeignKey &&
                    !column.isPrimaryKey &&
                    "border-l-violet-500/40",
                !column.isPrimaryKey &&
                    !column.isForeignKey &&
                    "border-l-transparent",
            )}
        >
            <div className="w-14 pl-2 pr-1 shrink-0">
                <ColumnBadges column={column} />
            </div>

            <div className="flex-1 px-1 py-1.5 min-w-0">
                {editing ? (
                    <Input
                        ref={nameInputRef}
                        value={draftName}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        onBlur={commitNameOnBlur}
                        onKeyDown={handleNameKeyDown}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className="nodrag h-7 text-sm border-0 bg-transparent! dark:bg-transparent! shadow-none p-0 font-mono text-foreground
                               focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-0!
                               focus-visible:bg-indigo-500/10 focus-visible:rounded focus-visible:px-1 w-full"
                    />
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onDoubleClick={openEditor}
                        onKeyDown={displayNameKeyDown}
                        title="Double-click to rename column"
                        aria-label={`Rename column ${column.name}`}
                        className="h-7 w-full justify-start rounded px-0 text-sm font-mono text-foreground hover:bg-transparent select-none"
                    >
                        <span className="truncate">{column.name}</span>
                    </Button>
                )}
                <InlineFieldError
                    id={errorId}
                    message={error}
                    compact
                    className="max-w-[170px]"
                />
            </div>

            <div className="w-20 px-0.5 py-1 shrink-0 flex items-center justify-end">
                {isHovered ? (
                    <Select
                        value={column.type}
                        onValueChange={(v) =>
                            onUpdate({ ...column, type: v as ColumnType })
                        }
                    >
                        <SelectTrigger className="h-6 text-[11px] border-0! bg-transparent! dark:bg-transparent! dark:hover:bg-transparent! shadow-none px-1 focus-visible:ring-0! focus-visible:border-0! text-muted-foreground justify-end! gap-0.5 w-auto [&>svg]:opacity-50 [&>svg]:size-2.5! font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COLUMN_TYPES.map((t) => (
                                <SelectItem
                                    key={t}
                                    value={t}
                                    className="text-sm font-mono"
                                >
                                    {t}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <span className="text-[11px] text-muted-foreground font-mono px-1">
                        {column.type}
                    </span>
                )}
            </div>

            <div className="w-12 px-1 shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isHovered && (
                        <>
                            <ColumnSettingsPopover
                                nodeId={nodeId}
                                column={column}
                                onUpdate={onUpdate}
                            />
                            {!column.isPrimaryKey && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemove(column.id)}
                                            className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" data-node-tooltip="">
                                        Delete column
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(TableNodeColumnRow);
