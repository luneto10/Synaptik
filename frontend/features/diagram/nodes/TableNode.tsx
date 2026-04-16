"use client";

import {
    memo,
    useCallback,
    useState,
    Fragment,
    type CSSProperties,
} from "react";
import { NodeResizer, Handle, Position } from "@xyflow/react";
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
import { handleIds } from "../utils/handleIds";
import { cn } from "@/lib/utils";
import { LAYOUT } from "../constants";

// Heights must match the actual rendered node layout
const HEADER_HEIGHT = 48;
const FOOTER_HEIGHT = 40;
const ROW_HEIGHT = 34;
const SEPARATOR_HEIGHT = 1;

/** Vertical center (px from node top) of column row at index i. */
const rowCenterY = (i: number) =>
    HEADER_HEIGHT + SEPARATOR_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;

function TableNode({ id, data, selected, dragging }: NodeProps<TableNodeType>) {
    const addColumn = useDiagramStore((s) => s.addColumn);
    const updateColumn = useDiagramStore((s) => s.updateColumn);
    const removeColumn = useDiagramStore((s) => s.removeColumn);

    const [focusColId, setFocusColId] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState(false);

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

    // Handles are visible only when selected and not being dragged or resized
    const showHandles = selected && !dragging && !isResizing;

    // Dynamic minimum height: must fit all PK + FK rows so user can't resize them away
    const requiredRows = data.columns.filter(
        (c) => c.isPrimaryKey || c.isForeignKey,
    ).length;
    const minHeight = Math.max(
        LAYOUT.MIN_NODE_HEIGHT,
        HEADER_HEIGHT +
            FOOTER_HEIGHT +
            SEPARATOR_HEIGHT +
            Math.max(1, requiredRows) * ROW_HEIGHT,
    );

    // ── Visible interaction dot (source handle, appears on selection) ──────────
    // Keep the handle center exactly on the node wall so edge endpoints
    // visually terminate on the border instead of floating outside.
    const DOT_SIZE = 8;
    const visibleDot = (side: "left" | "right"): CSSProperties => ({
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: "50%",
        background: "#fff",
        border: "2px solid #6366f1",
        opacity: showHandles ? 1 : 0,
        pointerEvents: showHandles ? "all" : "none",
        transition: "opacity 120ms",
        cursor: "crosshair",
        [side]: 0,
        transform: side === "left" ? "translateX(-50%)" : "translateX(50%)",
        boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
    });

    // Invisible node-level target — large hit area so drops land easily
    const invisibleTarget = (side: "left" | "right"): CSSProperties => ({
        width: 20,
        height: 20,
        opacity: 0,
        background: "transparent",
        border: "none",
        pointerEvents: "all",
        [side]: -10,
    });

    // ── Column routing handles (invisible, positioned at each row's Y) ─────────
    // These live OUTSIDE the overflow:hidden div so they're not clipped.
    // Edges connect to these handles, placing arrow endpoints at the correct row.
    const ROUTE_SIZE = 8;
    const routingHandle = (
        yCenter: number,
        side: "left" | "right",
    ): CSSProperties => ({
        width: ROUTE_SIZE,
        height: ROUTE_SIZE,
        opacity: 0,
        background: "transparent",
        border: "none",
        top: yCenter,
        [side]: 0,
        transform: side === "left" ? "translateX(-50%)" : "translateX(50%)",
        pointerEvents: "none",
    });
    const routingTarget = (
        yCenter: number,
        side: "left" | "right",
    ): CSSProperties => ({
        ...routingHandle(yCenter, side),
        pointerEvents: "all",
    });

    const nh = handleIds(id);

    return (
        <>
            <NodeResizer
                minWidth={LAYOUT.MIN_NODE_WIDTH}
                minHeight={minHeight}
                isVisible={selected}
                lineClassName="border-indigo-400/70! border-dashed!"
                handleClassName="!w-3 !h-3 !bg-background !border-[1.5px] !border-indigo-400 !rounded-full !shadow-sm"
                onResizeStart={() => {
                    endDiagramHistoryGestureIfActive();
                    setIsResizing(true);
                }}
                onResizeEnd={() => {
                    setIsResizing(false);
                    endDiagramHistoryGestureDeferred();
                }}
            />

            {/* ── Column routing handles — invisible, at each row's Y center ── */}
            {data.columns.map((col, i) => {
                const yc = rowCenterY(i);
                const ch = handleIds(col.id);
                return (
                    <Fragment key={col.id}>
                        <Handle
                            type="source"
                            position={Position.Left}
                            id={ch.sourceLeft}
                            style={routingHandle(yc, "left")}
                        />
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={ch.sourceRight}
                            style={routingHandle(yc, "right")}
                        />
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={ch.targetLeft}
                            style={routingTarget(yc, "left")}
                        />
                        <Handle
                            type="target"
                            position={Position.Right}
                            id={ch.targetRight}
                            style={routingTarget(yc, "right")}
                        />
                    </Fragment>
                );
            })}

            {/* ── Node-level interaction dots — visible source + invisible target ── */}
            <Handle
                type="source"
                position={Position.Left}
                id={nh.sourceLeft}
                style={visibleDot("left")}
            />
            <Handle
                type="source"
                position={Position.Right}
                id={nh.sourceRight}
                style={visibleDot("right")}
            />
            <Handle
                type="target"
                position={Position.Left}
                id={nh.targetLeft}
                style={invisibleTarget("left")}
            />
            <Handle
                type="target"
                position={Position.Right}
                id={nh.targetRight}
                style={invisibleTarget("right")}
            />

            <div
                className={cn(
                    "bg-card rounded-xl border w-full h-full flex flex-col overflow-hidden",
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
