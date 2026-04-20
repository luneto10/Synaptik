"use client";

import { memo } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Fingerprint,
    ToggleLeft,
    Clock,
    Braces,
    DecimalsArrowRight,
    Binary,
    LucideIcon,
} from "lucide-react";
import { IoText } from "react-icons/io5";
import type { IconType } from "react-icons";
import type { DbColumn, ColumnType } from "../types/db.types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<ColumnType, LucideIcon | IconType> = {
    uuid: Fingerprint,
    text: IoText,
    varchar: IoText,
    int: Binary,
    bigint: Binary,
    boolean: ToggleLeft,
    timestamp: Clock,
    jsonb: Braces,
    float: DecimalsArrowRight,
};

export const ICON_CLS = "w-3 h-3 shrink-0";

function TypeIcon({ type }: { type: ColumnType }) {
    const Icon = TYPE_ICONS[type];
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex text-foreground/80">
                    <Icon className="w-3 h-3 shrink-0" />
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="font-mono"
                data-node-tooltip=""
            >
                {type}
            </TooltipContent>
        </Tooltip>
    );
}

function Pill({ label, cls }: { label: string; cls: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center",
                "text-[8px] font-bold leading-none tracking-wide",
                "px-1 py-0.5 rounded",
                cls,
            )}
        >
            {label}
        </span>
    );
}

function ColumnBadges({ column }: { column: DbColumn }) {
    return (
        <div className="flex gap-0.5 items-center flex-wrap">
            <TypeIcon type={column.type} />
            {column.isPrimaryKey && (
                <Pill label="PK" cls="bg-amber-500/15 text-amber-500 border border-amber-500/25" />
            )}
            {column.isForeignKey && (
                <Pill label="FK" cls="bg-violet-500/15 text-violet-400 border border-violet-500/25" />
            )}
            {column.isUnique && !column.isPrimaryKey && (
                <Pill label="U" cls="bg-sky-500/15 text-sky-400 border border-sky-500/25" />
            )}
            {column.isNullable && (
                <Pill label="?" cls="bg-muted/60 text-muted-foreground/50 border border-border/40" />
            )}
        </div>
    );
}

export default memo(ColumnBadges);
