"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";
import { SidePicker } from "../components/SidePicker";
import { useDiagramStore } from "../store/diagramStore";
import { isTableNode } from "../types/flow.types";
import type { TableNode } from "../types/flow.types";
import { getHandleSide } from "../utils/handleIds";
import { ColumnSettingsFlagToggles } from "./ColumnSettingsFlagToggles";
import { ColumnSettingsFkReferenceSection } from "./ColumnSettingsFkReferenceSection";
import { ColumnSettingsTypeSection } from "./ColumnSettingsTypeSection";
import type {
    ColumnSettingsPopoverProps,
    ColumnSettingsSnapshot,
} from "./ColumnSettingsPopover.types";

const EMPTY_SNAPSHOT: ColumnSettingsSnapshot = {
    otherNodes: [],
    connectedEdge: undefined,
    currentSide: null,
};

export default function ColumnSettingsPopover({
    nodeId,
    column,
    onUpdate,
}: ColumnSettingsPopoverProps) {
    const [open, setOpen] = useState(false);
    const [snap, setSnap] = useState<ColumnSettingsSnapshot>(EMPTY_SNAPSHOT);
    const dialect = useDiagramStore((state) => state.dialect);

    const readSnapshot = useCallback((): ColumnSettingsSnapshot => {
        const { nodes, edges } = useDiagramStore.getState();
        const otherNodes = nodes.filter(
            (node): node is TableNode => node.id !== nodeId && isTableNode(node),
        );
        const connectedEdge = edges.find(
            (edge) =>
                (edge.source === nodeId && edge.data?.sourceColumnId === column.id) ||
                (edge.target === nodeId && edge.data?.targetColumnId === column.id),
        );

        let currentSide: "left" | "right" | null = null;
        if (connectedEdge) {
            currentSide =
                connectedEdge.source === nodeId
                    ? getHandleSide(connectedEdge.sourceHandle)
                    : getHandleSide(connectedEdge.targetHandle);
        }

        return { otherNodes, connectedEdge, currentSide };
    }, [column.id, nodeId]);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) {
            setSnap(readSnapshot());
        }
    };

    const handleUpdate = useCallback(
        (updatedColumn: typeof column) => {
            if (column.isForeignKey && !updatedColumn.isForeignKey) {
                const { deleteEdgeOnly, edges } = useDiagramStore.getState();
                const edge = edges.find(
                    (candidate) =>
                        candidate.target === nodeId &&
                        candidate.data?.targetColumnId === column.id,
                );
                if (edge) {
                    deleteEdgeOnly(edge.id);
                }
            }

            onUpdate(updatedColumn);
        },
        [column.id, column.isForeignKey, nodeId, onUpdate],
    );

    const handleFlipSide = () => {
        useDiagramStore.getState().flipColumnHandleSide(nodeId, column.id);
        setSnap(readSnapshot());
    };

    const handleRetarget = (nextNodeId: string, colId: string, tableId: string) => {
        useDiagramStore.getState().retargetFkColumn(nextNodeId, colId, tableId);
        setSnap(readSnapshot());
    };

    const refPk = snap.otherNodes
        .find((node) => node.id === column.references?.tableId)
        ?.data.columns.find((candidate) => candidate.isPrimaryKey);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onPointerDown={(event) => event.stopPropagation()}
                    className="nodrag nopan h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Column settings"
                    title="Column settings"
                >
                    <Settings2 className="h-3 w-3" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 space-y-3 p-3" side="right">
                <p className="text-xs font-semibold">
                    Column:{" "}
                    <span className="font-mono text-indigo-400">
                        {column.name}
                    </span>
                </p>

                <Separator />

                <ColumnSettingsFlagToggles
                    column={column}
                    onUpdate={handleUpdate}
                />

                <ColumnSettingsTypeSection
                    column={column}
                    dialect={dialect}
                    onUpdate={handleUpdate}
                />

                {snap.currentSide !== null && (
                    <div className="space-y-1.5 border-t border-border pt-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Arrow side
                        </p>
                        <SidePicker
                            label=""
                            side={snap.currentSide}
                            onFlip={handleFlipSide}
                        />
                    </div>
                )}

                {column.isForeignKey && (
                    <ColumnSettingsFkReferenceSection
                        column={column}
                        nodeId={nodeId}
                        otherNodes={snap.otherNodes}
                        refPk={refPk}
                        onRetarget={handleRetarget}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}
