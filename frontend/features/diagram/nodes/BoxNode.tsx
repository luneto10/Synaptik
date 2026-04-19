"use client";

import { memo, useState } from "react";
import { NodeResizer, NodeToolbar, Position, type NodeProps } from "@xyflow/react";
import {
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../store/diagramHistory";
import { BOX } from "../constants";
import type { BoxNode as BoxNodeType } from "../types/flow.types";
import { BoxNodeEditor } from "./BoxNodeEditor";

function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function BoxNode({ id, data, selected }: NodeProps<BoxNodeType>) {
    const [isResizing, setIsResizing] = useState(false);

    const fill = hexToRgba(data.color, data.opacity);
    const borderColor = data.color;

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
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
                isVisible={selected}
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
                className="w-full h-full rounded-xl border-2 transition-colors duration-150"
                style={{
                    backgroundColor: fill,
                    borderColor,
                    boxShadow: selected || isResizing
                        ? `0 0 0 1px ${borderColor}40`
                        : undefined,
                }}
            >
                {data.title && (
                    <div className="px-3 py-2 text-base font-bold text-foreground/90 select-none">
                        {data.title}
                    </div>
                )}
            </div>
        </>
    );
}

export default memo(BoxNode);
