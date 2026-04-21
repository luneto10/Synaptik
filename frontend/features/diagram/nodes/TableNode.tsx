"use client";

import {
    memo,
    useCallback,
    useState,
    useMemo,
    Fragment,
} from "react";
import { NodeResizer, Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import type { TableNode as TableNodeType } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";

const getStore = () => useDiagramStore.getState();
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

// Invariant — side never changes, so these are stable module-level objects.
const INVISIBLE_TARGET_LEFT = invisibleTargetStyle("left");
const INVISIBLE_TARGET_RIGHT = invisibleTargetStyle("right");

// Separated from the parent so dragging/selection changes don't cause the
// column routing handles to re-render (they only depend on columns).
const RoutingHandles = memo(function RoutingHandles({
    columns,
}: {
    columns: DbColumn[];
}) {
    return (
        <>
            {columns.map((col, i) => {
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
        </>
    );
});

function TableNode({ id, data, selected, dragging }: NodeProps<TableNodeType>) {
    const [focusColId, setFocusColId] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const { endGesture, endGestureIfActive } = useHistoryGestureHandlers();

    const isSolelySelected = useDiagramStore(
        useCallback((s) => s.selectedCount === 1 && selected, [selected])
    );

    const handleAddColumn = useCallback(() => {
        const newId = crypto.randomUUID();
        getStore().addColumn(id, newId);
        setFocusColId(newId);
    }, [id]);

    const handleFocusConsumed = useCallback(() => setFocusColId(null), []);

    const handleUpdateColumn = useCallback(
        (col: DbColumn) => getStore().updateColumn(id, col),
        [id],
    );

    const handleRemoveColumn = useCallback(
        (colId: string) => getStore().removeColumn(id, colId),
        [id],
    );

    const showHandles = isSolelySelected && !dragging && !isResizing;

    const requiredRows = data.columns.filter(
        (c) => c.isPrimaryKey || c.isForeignKey,
    ).length;
    const minHeight = computeTableMinHeight(requiredRows);

    // Stable string values — memo prevents object churn on drag frames.
    const nh = useMemo(() => handleIds(id), [id]);
    const dotLeftStyle = useMemo(() => visibleDotStyle("left", showHandles), [showHandles]);
    const dotRightStyle = useMemo(() => visibleDotStyle("right", showHandles), [showHandles]);

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

            <RoutingHandles columns={data.columns} />

            <Handle
                type="source"
                position={Position.Left}
                id={nh.sourceLeft}
                style={dotLeftStyle}
            />
            <Handle
                type="source"
                position={Position.Right}
                id={nh.sourceRight}
                style={dotRightStyle}
            />
            <Handle
                type="target"
                position={Position.Left}
                id={nh.targetLeft}
                style={INVISIBLE_TARGET_LEFT}
            />
            <Handle
                type="target"
                position={Position.Right}
                id={nh.targetRight}
                style={INVISIBLE_TARGET_RIGHT}
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
                <div className="shrink-0">
                    <TableNodeHeader
                        nodeId={id}
                        tableName={data.name}
                        columnCount={data.columns.length}
                        isJunction={data.isJunction}
                    />
                </div>

                <TableNodeColumns
                    nodeId={id}
                    columns={data.columns}
                    focusColId={focusColId}
                    onFocusConsumed={handleFocusConsumed}
                    onUpdate={handleUpdateColumn}
                    onRemove={handleRemoveColumn}
                />

                <div className="shrink-0">
                    <TableNodeFooter onAddColumn={handleAddColumn} />
                </div>
            </div>
        </>
    );
}

export default memo(TableNode);
