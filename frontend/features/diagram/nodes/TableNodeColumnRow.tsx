"use client";

import { memo, useEffect, useRef, useState } from "react";
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
import {
    COLUMN_TYPES,
    type DbColumn,
    type ColumnType,
} from "../types/db.types";
import ColumnBadges from "./ColumnBadges";
import ColumnSettingsPopover from "./ColumnSettingsPopover";
import { onInputCommit } from "../utils/onInputCommit";
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
    const nameInputRef = useRef<HTMLInputElement>(null);
    const isFreshColumnRef = useRef(false);
    const [draftName, setDraftName] = useState(column.name);
    const [error, setError] = useState<string | null>(null);
    const errorId = `${column.id}-name-error`;

    useEffect(() => {
        if (autoFocus && nameInputRef.current) {
            isFreshColumnRef.current = true;
            nameInputRef.current.focus();
            nameInputRef.current.select();
            onFocusConsumed?.();
        }
    }, [autoFocus, onFocusConsumed]);

    const commitName = (source: "blur" | "enter"): "applied" | "blocked" => {
        const next = draftName.trim();
        if (!next || next === column.name) {
            setDraftName(column.name);
            setError(null);
            return "applied";
        }
        const hasDuplicate = hasDuplicateName(next, column.id);
        if (hasDuplicate) {
            const shouldDiscardFreshColumn =
                isFreshColumnRef.current && source === "blur";
            if (shouldDiscardFreshColumn) {
                onRemove(column.id);
                return "blocked";
            }
            setError("Duplicate column name.");
            requestAnimationFrame(() => {
                nameInputRef.current?.focus();
                nameInputRef.current?.select();
            });
            return "blocked";
        }
        setError(null);
        onUpdate({ ...column, name: next });
        isFreshColumnRef.current = false;
        return "applied";
    };

    const cancelName = () => {
        const isDuplicateDraft = hasDuplicateName(draftName, column.id);
        if (isFreshColumnRef.current && isDuplicateDraft) {
            onRemove(column.id);
            return;
        }
        setDraftName(column.name);
        setError(null);
    };

    const rowAccent = column.isPrimaryKey
        ? "border-l-2 border-l-amber-500/50"
        : column.isForeignKey
          ? "border-l-2 border-l-violet-500/40"
          : "border-l-2 border-l-transparent";

    return (
        <div
            className={`group relative flex items-center border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors ${rowAccent}`}
        >
            {/* Badges */}
            <div className="w-14 pl-2 pr-1 shrink-0">
                <ColumnBadges column={column} />
            </div>

            {/* Name */}
            <div className="flex-1 px-1 py-1.5 min-w-0">
                <Input
                    ref={nameInputRef}
                    value={draftName}
                    onChange={(e) => {
                        setDraftName(e.target.value);
                        if (error) setError(null);
                    }}
                    onBlur={() => commitName("blur")}
                    onKeyDown={(e) => {
                        onInputCommit(e, {
                            onCommit: () => {
                                const result = commitName("enter");
                                if (result === "applied") {
                                    e.currentTarget.blur();
                                }
                            },
                            onCancel: () => {
                                cancelName();
                                e.currentTarget.blur();
                            },
                        });
                        e.stopPropagation();
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className="h-7 text-sm border-0 bg-transparent! dark:bg-transparent! shadow-none p-0 font-mono text-foreground
                               focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-0!
                               focus-visible:bg-indigo-500/10 focus-visible:rounded focus-visible:px-1 w-full"
                />
                <InlineFieldError
                    id={errorId}
                    message={error}
                    compact
                    className="max-w-[170px]"
                />
            </div>

            {/* Type */}
            <div className="w-20 px-0.5 py-1 shrink-0 flex items-center justify-end">
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
            </div>

            {/* Actions */}
            <div className="w-12 px-1 shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            <TooltipContent side="top">
                                Delete column
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

        </div>
    );
}

export default memo(TableNodeColumnRow);
