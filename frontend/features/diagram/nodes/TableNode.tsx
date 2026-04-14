"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import type { TableNode as TableNodeType } from "../types/flow.types";
import TableNodeHeader from "./TableNodeHeader";
import TableNodeColumns from "./TableNodeColumns";
import TableNodeFooter from "./TableNodeFooter";

function TableNode({ id, data, selected }: NodeProps<TableNodeType>) {
    const { addColumn, updateColumn, removeColumn } = useDiagramStore((s) => ({
        addColumn: s.addColumn,
        updateColumn: s.updateColumn,
        removeColumn: s.removeColumn,
    }));

    return (
        <div
            className={`
        bg-white rounded-xl border shadow-sm min-w-[300px]
        transition-shadow duration-150
        ${
            selected
                ? "border-indigo-500 shadow-indigo-100 shadow-md ring-2 ring-indigo-200"
                : "border-slate-200 hover:shadow-md"
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
                onUpdate={(col) => updateColumn(id, col)}
                onRemove={(colId) => removeColumn(id, colId)}
            />

            {/* ── Footer ── */}
            <TableNodeFooter onAddColumn={() => addColumn(id)} />

            {/* ── React Flow handles ── */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3! h-3! bg-indigo-500! border-2! border-white! rounded-full"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3! h-3! bg-indigo-500! border-2! border-white! rounded-full"
            />
        </div>
    );
}

export default memo(TableNode);
