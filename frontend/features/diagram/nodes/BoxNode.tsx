"use client";

import { memo, useState } from "react";
import {
    NodeResizer,
    NodeToolbar,
    Position,
    useStore,
    type NodeProps,
} from "@xyflow/react";
import {
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../store/diagramHistory";
import { BOX } from "../constants";
import type { BoxNode as BoxNodeType } from "../types/flow.types";
import { hexToRgba } from "../utils/color";
import { BoxNodeEditor } from "./BoxNodeEditor";

function BoxNode({ id, data, selected }: NodeProps<BoxNodeType>) {
    const [isResizing, setIsResizing] = useState(false);
    const selectedCount = useStore((s) => s.nodes.filter((n) => n.selected).length);
    const isSolelySelected = selected && selectedCount === 1;

    const fill = hexToRgba(data.color, data.opacity);
    const borderColor = data.color;

    return (
        <>
            <NodeToolbar
                isVisible={isSolelySelected}
                position={Position.Top}
                offset={8}
                style={{ zIndex: 1000 }}
            >
                <BoxNodeEditor
                    nodeId={id}
                    title={data.title}
                    color={data.color}
                    opacity={data.opacity}
                />
            </NodeToolbar>

            <NodeResizer
                minWidth={BOX.MIN_WIDTH}
                minHeight={BOX.MIN_HEIGHT}
                isVisible={isSolelySelected}
                lineClassName="border-indigo-500/20! border-solid!"
                handleClassName="!w-[9px] !h-[9px] !rounded-full !bg-background !border !border-indigo-500/60 !ring-1 !ring-indigo-500/30 hover:!border-indigo-400 hover:!ring-indigo-500/40 !transition-colors !duration-100 !shadow-sm"
                onResizeStart={() => {
                    endDiagramHistoryGestureIfActive();
                    setIsResizing(true);
                }}
                onResizeEnd={() => {
                    setIsResizing(false);
                    endDiagramHistoryGestureDeferred();
                }}
            />

            <div
                className="w-full h-full rounded-xl border-2 transition-colors duration-150 cursor-grab active:cursor-grabbing"
                style={{
                    backgroundColor: fill,
                    borderColor,
                    boxShadow:
                        selected || isResizing
                            ? `0 0 0 1px ${borderColor}40, 0 20px 25px -5px ${borderColor}15, 0 8px 10px -6px ${borderColor}10`
                            : undefined,
                }}
            >
                {data.title && (
                    <div className="px-4 py-3 text-3xl font-bold text-foreground/90 select-none">
                        {data.title}
                    </div>
                )}
            </div>
        </>
    );
}

export default memo(BoxNode);
