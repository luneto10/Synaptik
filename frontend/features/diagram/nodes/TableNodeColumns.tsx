"use client";

import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DbColumn } from "../types/db.types";
import { normalizeName } from "../utils/nameValidation";
import TableNodeColumnRow from "./TableNodeColumnRow";

interface TableNodeColumnsProps {
    nodeId: string;
    columns: DbColumn[];
    focusColId: string | null;
    onFocusConsumed: () => void;
    onUpdate: (column: DbColumn) => void;
    onRemove: (colId: string) => void;
}

function TableNodeColumns({
    nodeId,
    columns,
    focusColId,
    onFocusConsumed,
    onUpdate,
    onRemove,
}: TableNodeColumnsProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const check = () => {
            const viewport = wrapper.querySelector(
                "[data-slot='scroll-area-viewport']",
            ) as HTMLElement | null;
            if (!viewport) return;
            setHasOverflow(viewport.scrollHeight > viewport.clientHeight);
        };

        check();
        const ro = new ResizeObserver(check);
        ro.observe(wrapper);
        return () => ro.disconnect();
    }, [columns.length]);

    const duplicateIndex = useMemo(() => {
        const counts = new Map<string, number>();
        const byColumnId = new Map<string, string>();
        for (const column of columns) {
            const normalized = normalizeName(column.name);
            byColumnId.set(column.id, normalized);
            if (!normalized) continue;
            counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
        }
        return { counts, byColumnId };
    }, [columns]);

    const hasDuplicateName = useCallback(
        (candidate: string, excludeColumnId: string) => {
            const normalizedCandidate = normalizeName(candidate);
            if (!normalizedCandidate) return false;

            const existingName = duplicateIndex.byColumnId.get(excludeColumnId);
            const existingCount = duplicateIndex.counts.get(normalizedCandidate) ?? 0;

            if (existingName === normalizedCandidate) {
                return existingCount > 1;
            }
            return existingCount > 0;
        },
        [duplicateIndex],
    );

    return (
        <div
            ref={wrapperRef}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
            <Separator className="shrink-0 bg-border/70" />
            <ScrollArea
                className={cn(
                    "flex-1 overflow-hidden",
                    hasOverflow && "nowheel",
                )}
            >
                <div className="flex flex-col">
                    {columns.map((col) => (
                        <TableNodeColumnRow
                            key={col.id}
                            nodeId={nodeId}
                            column={col}
                            hasDuplicateName={hasDuplicateName}
                            autoFocus={col.id === focusColId}
                            onFocusConsumed={onFocusConsumed}
                            onUpdate={onUpdate}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

export default memo(TableNodeColumns);
