"use client";

import { memo, useState } from "react";
import {
    NodeResizer,
    NodeToolbar,
    Position,
    type NodeProps,
} from "@xyflow/react";
import { useSelectedCount } from "../components/canvas/SelectedCountContext";
import {
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../store/diagramHistory";
import { BOX } from "../constants";
import type { BoxNode as BoxNodeType } from "../types/flow.types";
import { cn } from "@/lib/utils";
import { hexToRgba, lightenHex } from "../utils/color";
import { BoxNodeEditor } from "./BoxNodeEditor";

function BoxNode({ id, data, selected }: NodeProps<BoxNodeType>) {
    const [isResizing, setIsResizing] = useState(false);
    const selectedCount = useSelectedCount();
    const isSolelySelected = selected && selectedCount === 1;

    const fill = hexToRgba(data.color, data.opacity);
    const borderColor = data.color;
    const active = selected || isResizing;
    const edgeColor = lightenHex(borderColor, 0.32) ?? borderColor;

    const categoryLiftShadow = active
        ? [
              `inset 0 1px 0 0 rgba(255,255,255,0.28)`,
              `0 0 0 2px ${hexToRgba(edgeColor, 0.95)}`,
              `0 0 0 5px ${hexToRgba(edgeColor, 0.35)}`,
              `0 0 40px 2px ${hexToRgba(edgeColor, 0.38)}`,
              `0 18px 36px -10px ${hexToRgba(edgeColor, 0.22)}`,
          ].join(", ")
        : undefined;

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
                className={cn(
                    "w-full h-full rounded-xl border-solid transition-[box-shadow,border-width,border-color] duration-150 cursor-grab active:cursor-grabbing",
                    !active && "shadow-md hover:shadow-lg",
                )}
                style={{
                    backgroundColor: fill,
                    borderStyle: "solid",
                    borderWidth: active ? 3 : 2,
                    borderColor: active ? edgeColor : borderColor,
                    boxShadow: categoryLiftShadow,
                }}
            >
                {data.title && (
                    <div className="px-4 py-3 text-3xl font-bold text-foreground/90 select-none wrap-break-word whitespace-pre-wrap">
                        {data.title}
                    </div>
                )}
            </div>
        </>
    );
}

export default memo(BoxNode);
