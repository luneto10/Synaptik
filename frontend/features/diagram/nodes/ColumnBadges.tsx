"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Fingerprint,
    CaseSensitive,
    Hash,
    ToggleLeft,
    Clock,
    Braces,
    Divide,
    KeyRound,
    Link2,
    CircleDot,
    type LucideIcon,
} from "lucide-react";
import type { DbColumn, ColumnType } from "../types/db.types";
import { cn } from "@/lib/utils";

// ── Type → icon map (different types may share the same icon) ─────────────────

const TYPE_ICONS: Record<ColumnType, LucideIcon> = {
    uuid: Fingerprint,
    text: CaseSensitive,
    varchar: CaseSensitive,
    int: Hash,
    bigint: Hash,
    boolean: ToggleLeft,
    timestamp: Clock,
    jsonb: Braces,
    float: Divide,
};

// ── Badge helpers ─────────────────────────────────────────────────────────────

export const ICON_CLS = "w-3 h-3 shrink-0";

const WIDE_ICONS = new Set<LucideIcon>([CaseSensitive]);

function TypeIcon({ type }: { type: ColumnType }) {
    const Icon = TYPE_ICONS[type];
    const cls = cn(WIDE_ICONS.has(Icon) ? "w-4 h-3" : ICON_CLS, "text-foreground/40");
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex">
                    <Icon className={cls} />
                </span>
            </TooltipTrigger>
            <TooltipContent side="top">{type}</TooltipContent>
        </Tooltip>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ColumnBadges({ column }: { column: DbColumn }) {
    return (
        <div className="flex gap-0.5 items-center">
            <TypeIcon type={column.type} />

            {column.isPrimaryKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <KeyRound className={cn(ICON_CLS, "text-amber-500")} />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Primary key</TooltipContent>
                </Tooltip>
            )}

            {column.isForeignKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <Link2 className={cn(ICON_CLS, "text-violet-500")} />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        Foreign key
                        {column.references && (
                            <span className="block text-muted-foreground font-mono text-[10px]">
                                → {column.references.tableId.slice(0, 8)}…
                            </span>
                        )}
                    </TooltipContent>
                </Tooltip>
            )}

            {column.isUnique && !column.isPrimaryKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <CircleDot className={cn(ICON_CLS, "text-sky-400")} />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Unique</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
