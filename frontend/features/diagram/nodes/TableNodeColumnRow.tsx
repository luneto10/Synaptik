"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position } from "@xyflow/react";
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
import { handleIds } from "../utils/handleIds";
import { onInputCommit } from "../utils/onInputCommit";

interface Props {
    nodeId: string;
    column: DbColumn;
    autoFocus?: boolean;
    onFocusConsumed?: () => void;
    onUpdate: (column: DbColumn) => void;
    onRemove: (colId: string) => void;
}

function TableNodeColumnRow({
    nodeId,
    column,
    autoFocus,
    onFocusConsumed,
    onUpdate,
    onRemove,
}: Props) {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [draftName, setDraftName] = useState(column.name);

    useEffect(() => {
        setDraftName(column.name);
    }, [column.id, column.name]);

    useEffect(() => {
        if (autoFocus && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
            onFocusConsumed?.();
        }
    }, [autoFocus, onFocusConsumed]);

    const handleCls =
        "w-3.5! h-3.5! bg-indigo-500! border-2! border-card! rounded-full! opacity-0! group-hover:opacity-60! hover:!opacity-100! transition-opacity! cursor-crosshair!";

    const commitName = () => {
        const next = draftName.trim();
        if (!next || next === column.name) {
            setDraftName(column.name);
            return;
        }
        onUpdate({ ...column, name: next });
    };

    const cancelName = () => {
        setDraftName(column.name);
    };

    const rowAccent = column.isPrimaryKey
        ? "border-l-2 border-l-amber-500/50"
        : column.isForeignKey
          ? "border-l-2 border-l-violet-500/40"
          : "border-l-2 border-l-transparent";

    return (
        <div className={`group relative flex items-center border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors ${rowAccent}`}>
            {/* ── Handles (left: source + target, right: source + target) ── */}
            <Handle type="source" position={Position.Left}  id={handleIds(column.id).sourceLeft}  className={handleCls} />
            <Handle type="target" position={Position.Left}  id={handleIds(column.id).targetLeft}  className={handleCls} />
            <Handle type="target" position={Position.Right} id={handleIds(column.id).targetRight} className={handleCls} />

            {/* Badges */}
            <div className="w-14 pl-2 pr-1 shrink-0">
                <ColumnBadges column={column} />
            </div>

            {/* Name */}
            <div className="flex-1 px-1 py-1.5 min-w-0">
                <Input
                    ref={nameInputRef}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                        onInputCommit(e, {
                            onCommit: () => { commitName(); e.currentTarget.blur(); },
                            onCancel: () => { cancelName(); e.currentTarget.blur(); },
                        });
                        e.stopPropagation();
                    }}
                    className="h-7 text-sm border-0 bg-transparent! dark:bg-transparent! shadow-none p-0 font-mono text-foreground
                               focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-0!
                               focus-visible:bg-indigo-500/10 focus-visible:rounded focus-visible:px-1 w-full"
                />
            </div>

            {/* Type */}
            <div className="w-20 px-0.5 py-1 shrink-0 flex items-center justify-end">
                <Select value={column.type} onValueChange={(v) => onUpdate({ ...column, type: v as ColumnType })}>
                    <SelectTrigger className="h-6 text-[11px] border-0! bg-transparent! dark:bg-transparent! dark:hover:bg-transparent! shadow-none px-1 focus-visible:ring-0! focus-visible:border-0! text-muted-foreground/70 justify-end! gap-0.5 w-auto [&>svg]:opacity-50 [&>svg]:size-2.5! font-mono">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {COLUMN_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-sm font-mono">{t}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Actions */}
            <div className="w-12 px-1 shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ColumnSettingsPopover nodeId={nodeId} column={column} onUpdate={onUpdate} />
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
                            <TooltipContent side="top">Delete column</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* ── Source handle (right) ── */}
            <Handle type="source" position={Position.Right} id={handleIds(column.id).sourceRight} className={handleCls} />
        </div>
    );
}

export default memo(TableNodeColumnRow);
