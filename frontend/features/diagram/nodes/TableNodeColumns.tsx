"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DbColumn } from "../types/db.types";
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

    // Only block canvas wheel-zoom when the column list actually overflows the
    // visible area.  A ResizeObserver on the wrapper catches node resize events;
    // columns.length as a dependency re-runs the check when columns are added or
    // removed (the viewport's scrollHeight changes, not the wrapper's).
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

    return (
        <div ref={wrapperRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Separator className="shrink-0" />
            {/* overflow-hidden: required so the flex item's min-height resolves
                to 0 (not content height), letting flex-1 size it correctly.
                nowheel: only added when content overflows — blocks ReactFlow's
                canvas scroll only when the user actually needs to scroll rows. */}
            <ScrollArea className={cn("flex-1 overflow-hidden", hasOverflow && "nowheel")}>
                <div className="flex flex-col">
                    {columns.map((col) => (
                        <TableNodeColumnRow
                            key={col.id}
                            nodeId={nodeId}
                            column={col}
                            siblingColumns={columns}
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
