"use client";

import { memo, useCallback, useState } from "react";
import { NodeResizer } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import {
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../store/diagramHistory";
import type { TableNode as TableNodeType } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import TableNodeHeader from "./TableNodeHeader";
import TableNodeColumns from "./TableNodeColumns";
import TableNodeFooter from "./TableNodeFooter";
import { cn } from "@/lib/utils";
import { LAYOUT } from "../constants";

function TableNode({ id, data, selected }: NodeProps<TableNodeType>) {
    const addColumn = useDiagramStore((s) => s.addColumn);
    const updateColumn = useDiagramStore((s) => s.updateColumn);
    const removeColumn = useDiagramStore((s) => s.removeColumn);

    // Track the column that should receive focus right after being added
    const [focusColId, setFocusColId] = useState<string | null>(null);

    const handleAddColumn = useCallback(() => {
        const newId = crypto.randomUUID();
        addColumn(id, newId);
        setFocusColId(newId);
    }, [id, addColumn]);

    const handleFocusConsumed = useCallback(() => setFocusColId(null), []);

    const handleUpdateColumn = useCallback(
        (col: DbColumn) => updateColumn(id, col),
        [id, updateColumn],
    );

    const handleRemoveColumn = useCallback(
        (colId: string) => removeColumn(id, colId),
        [id, removeColumn],
    );

    return (
        <>
            <NodeResizer
                minWidth={LAYOUT.MIN_NODE_WIDTH}
                minHeight={LAYOUT.MIN_NODE_HEIGHT}
                isVisible={selected}
                lineClassName="border-indigo-400!"
                handleClassName="bg-indigo-500! border-white! rounded-sm!"
                onResizeStart={() => {
                    // End any lingering gesture before starting a new resize.
                    endDiagramHistoryGestureIfActive();
                }}
                onResizeEnd={() => {
                    // Deferred fallback: ends the gesture if React Flow never emits
                    // resizing:false through onNodesChange (which is the primary path).
                    endDiagramHistoryGestureDeferred();
                }}
            />

            <div
                className={cn(
                    "bg-card rounded-xl border w-full h-full overflow-hidden",
                    "transition-all duration-150",
                    selected
                        ? "border-indigo-500/70 shadow-xl shadow-indigo-500/15 ring-1 ring-indigo-500/20"
                        : "border-border/60 shadow-md hover:border-border hover:shadow-lg",
                )}
            >
                {/* ── Header ── */}
                <TableNodeHeader
                    nodeId={id}
                    tableName={data.name}
                    columnCount={data.columns.length}
                />

                {/* ── Columns ── */}
                <TableNodeColumns
                    nodeId={id}
                    columns={data.columns}
                    focusColId={focusColId}
                    onFocusConsumed={handleFocusConsumed}
                    onUpdate={handleUpdateColumn}
                    onRemove={handleRemoveColumn}
                />

                {/* ── Footer ── */}
                <TableNodeFooter onAddColumn={handleAddColumn} />
            </div>
        </>
    );
}

export default memo(TableNode);
