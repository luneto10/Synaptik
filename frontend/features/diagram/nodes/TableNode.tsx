"use client";

import { memo, useCallback, useState } from "react";
import { NodeResizer } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import type { TableNode as TableNodeType } from "../types/flow.types";
import TableNodeHeader from "./TableNodeHeader";
import TableNodeColumns from "./TableNodeColumns";
import TableNodeFooter from "./TableNodeFooter";

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

    return (
        <>
            <NodeResizer
                minWidth={280}
                minHeight={120}
                isVisible={selected}
                lineClassName="border-indigo-400!"
                handleClassName="bg-indigo-500! border-white! rounded-sm!"
            />

            <div
                className={`
                    bg-card rounded-xl border shadow-md w-full h-full overflow-hidden
                    transition-shadow duration-150
                    ${
                        selected
                            ? "border-indigo-500 shadow-indigo-500/20 shadow-lg ring-1 ring-indigo-500/30"
                            : "border-border hover:shadow-lg"
                    }
                `}
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
                    onUpdate={(col) => updateColumn(id, col)}
                    onRemove={(colId) => removeColumn(id, colId)}
                />

                {/* ── Footer ── */}
                <TableNodeFooter onAddColumn={handleAddColumn} />
            </div>
        </>
    );
}

export default memo(TableNode);
