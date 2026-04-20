"use client";

import {
    memo,
    useCallback,
    useState,
    Fragment,
} from "react";
import { NodeResizer, Handle, Position, useStore } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import type { TableNode as TableNodeType } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import TableNodeHeader from "./TableNodeHeader";
import TableNodeColumns from "./TableNodeColumns";
import TableNodeFooter from "./TableNodeFooter";
import { handleIds } from "../utils/handleIds";
import { cn } from "@/lib/utils";
import { LAYOUT } from "../constants";
import { useHistoryGestureHandlers } from "../hooks/useHistoryGestureHandlers";
import {
    computeTableMinHeight,
    invisibleTargetStyle,
    routingHandleStyle,
    routingTargetStyle,
    rowCenterY,
    visibleDotStyle,
} from "./tableNodeHandles";

function TableNode({ id, data, selected, dragging }: NodeProps<TableNodeType>) {
    const addColumn = useDiagramStore((s) => s.addColumn);
    const updateColumn = useDiagramStore((s) => s.updateColumn);
    const removeColumn = useDiagramStore((s) => s.removeColumn);

    const [focusColId, setFocusColId] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const { endGesture, endGestureIfActive } = useHistoryGestureHandlers();
    const selectedCount = useStore((s) => s.nodes.filter((n) => n.selected).length);
    const isSolelySelected = selected && selectedCount === 1;

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

    // Handles are visible only when solely selected and not being dragged or resized
    const showHandles = isSolelySelected && !dragging && !isResizing;

    // Dynamic minimum height: must fit all PK + FK rows so user can't resize them away
    const requiredRows = data.columns.filter(
        (c) => c.isPrimaryKey || c.isForeignKey,
    ).length;
    const minHeight = computeTableMinHeight(requiredRows);

    const nh = handleIds(id);

    return (
        <>
            <NodeResizer
                minWidth={LAYOUT.MIN_NODE_WIDTH}
                minHeight={minHeight}
                isVisible={isSolelySelected}
                lineClassName="border-indigo-500/20! border-solid!"
                handleClassName="!w-[9px] !h-[9px] !rounded-full !bg-background !border !border-indigo-500/60 !ring-1 !ring-indigo-500/30 hover:!border-indigo-400 hover:!ring-indigo-500/40 !transition-colors !duration-100 !shadow-sm"
                onResizeStart={() => {
                    endGestureIfActive();
                    setIsResizing(true);
                }}
                onResizeEnd={() => {
                    setIsResizing(false);
                    endGesture();
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
                            style={routingHandleStyle(yc, "left")}
                        />
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={ch.sourceRight}
                            style={routingHandleStyle(yc, "right")}
                        />
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={ch.targetLeft}
                            style={routingTargetStyle(yc, "left")}
                        />
                        <Handle
                            type="target"
                            position={Position.Right}
                            id={ch.targetRight}
                            style={routingTargetStyle(yc, "right")}
                        />
                    </Fragment>
                );
            })}

            {/* ── Node-level interaction dots — visible source + invisible target ── */}
            <Handle
                type="source"
                position={Position.Left}
                id={nh.sourceLeft}
                style={visibleDotStyle("left", showHandles)}
            />
            <Handle
                type="source"
                position={Position.Right}
                id={nh.sourceRight}
                style={visibleDotStyle("right", showHandles)}
            />
            <Handle
                type="target"
                position={Position.Left}
                id={nh.targetLeft}
                style={invisibleTargetStyle("left")}
            />
            <Handle
                type="target"
                position={Position.Right}
                id={nh.targetRight}
                style={invisibleTargetStyle("right")}
            />

            <div
                className={cn(
                    "bg-card rounded-xl border w-full h-full flex flex-col overflow-hidden cursor-grab active:cursor-grabbing",
                    "transition-all duration-150",
                    selected && data.isJunction
                        ? "border-violet-500/70 shadow-xl shadow-violet-500/15 ring-1 ring-violet-500/20"
                        : selected
                        ? "border-indigo-500/70 shadow-xl shadow-indigo-500/15 ring-1 ring-indigo-500/20"
                        : "border-border/60 shadow-md hover:border-border hover:shadow-lg",
                )}
            >
                {/* ── Header — shrink-0 so it's never compressed by flex ── */}
                <div className="shrink-0">
                    <TableNodeHeader
                        nodeId={id}
                        tableName={data.name}
                        columnCount={data.columns.length}
                        isJunction={data.isJunction}
                    />
                </div>

                {/* ── Columns — flex-1 scroll area ── */}
                <TableNodeColumns
                    nodeId={id}
                    columns={data.columns}
                    focusColId={focusColId}
                    onFocusConsumed={handleFocusConsumed}
                    onUpdate={handleUpdateColumn}
                    onRemove={handleRemoveColumn}
                />

                {/* ── Footer — shrink-0 so it's never pushed out of view ── */}
                <div className="shrink-0">
                    <TableNodeFooter onAddColumn={handleAddColumn} />
                </div>
            </div>
        </>
    );
}

export default memo(TableNode);
