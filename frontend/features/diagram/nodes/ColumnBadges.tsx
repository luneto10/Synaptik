"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeyRound, Link2, CircleDot } from "lucide-react";
import type { DbColumn } from "../types/db.types";

export default function ColumnBadges({ column }: { column: DbColumn }) {
    return (
        <div className="flex gap-0.5 items-center">
            {column.isPrimaryKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Primary key</TooltipContent>
                </Tooltip>
            )}
            {column.isForeignKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <Link2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
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
                            <CircleDot className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Unique</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
