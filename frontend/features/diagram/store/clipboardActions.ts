import type { DbColumn } from "../types/db.types";
import {
    isBoxNode,
    isTableNode,
    type BoxNode,
    type DiagramNode,
    type RelationEdge,
    type TableNode,
} from "../types/flow.types";
import { handleIds } from "../utils/handleIds";
import {
    hasDuplicateCategoryTitle,
    hasDuplicateTableName,
} from "../utils/nameValidation";
import { LAYOUT, PASTE_OFFSET } from "../constants";
import type { DiagramState, SetState } from "./diagramStore.types";
import { getClipboard, setClipboard } from "./clipboard";
import { useDiagramStore } from "./diagramStore";

type ClipboardActions = Pick<DiagramState, "copySelection" | "pasteClipboard">;

function clearSelection(nodes: DiagramNode[]) {
    for (const node of nodes) {
        if (node.selected) node.selected = false;
    }
}

function uniqueTableName(tables: TableNode[], baseName: string): string {
    const first = `${baseName}_copy`;
    if (!hasDuplicateTableName(tables, first)) return first;
    let counter = 2;
    while (hasDuplicateTableName(tables, `${baseName}_copy_${counter}`)) {
        counter += 1;
    }
    return `${baseName}_copy_${counter}`;
}

function uniqueBoxTitle(boxes: BoxNode[], baseTitle: string): string {
    if (baseTitle.trim() === "") return baseTitle;
    const first = `${baseTitle}_copy`;
    if (!hasDuplicateCategoryTitle(boxes, first)) return first;
    let counter = 2;
    while (hasDuplicateCategoryTitle(boxes, `${baseTitle}_copy_${counter}`)) {
        counter += 1;
    }
    return `${baseTitle}_copy_${counter}`;
}

function remapHandle(
    handle: string | null | undefined,
    columnIdMap: Map<string, string>,
): string | null | undefined {
    if (!handle) return handle;
    const match = handle.match(/^(.*)-(source|target)-(left|right)$/);
    if (!match) return handle;
    const [, oldColId, role, side] = match;
    const newColId = columnIdMap.get(oldColId);
    if (!newColId) return handle;
    const ids = handleIds(newColId);
    if (role === "source") {
        return side === "left" ? ids.sourceLeft : ids.sourceRight;
    }
    return side === "left" ? ids.targetLeft : ids.targetRight;
}

function cloneColumn(
    col: DbColumn,
    columnIdMap: Map<string, string>,
    nodeIdMap: Map<string, string>,
): DbColumn {
    const newId = columnIdMap.get(col.id);
    if (!newId) throw new Error(`clipboardActions: missing columnIdMap entry for ${col.id}`);
    const cloned: DbColumn = { ...col, id: newId };
    if (col.references) {
        const mappedTable = nodeIdMap.get(col.references.tableId);
        if (mappedTable) {
            // FK points into the copied set — remap both ends.
            cloned.references = {
                tableId: mappedTable,
                columnId:
                    columnIdMap.get(col.references.columnId) ??
                    col.references.columnId,
            };
        } else {
            // FK points at an external (non-copied) table — keep original reference.
            cloned.references = { ...col.references };
        }
    }
    return cloned;
}

function cloneTableNode(
    table: TableNode,
    nodeIdMap: Map<string, string>,
    columnIdMap: Map<string, string>,
    existingTables: TableNode[],
    offset: { x: number; y: number },
): TableNode {
    const newId = nodeIdMap.get(table.id);
    if (!newId) throw new Error(`clipboardActions: missing nodeIdMap entry for ${table.id}`);
    const newName = uniqueTableName(existingTables, table.data.name);
    const newColumns = table.data.columns.map((c) =>
        cloneColumn(c, columnIdMap, nodeIdMap),
    );
    return {
        ...table,
        id: newId,
        selected: true,
        position: {
            x: table.position.x + offset.x,
            y: table.position.y + offset.y,
        },
        data: {
            ...table.data,
            id: newId,
            name: newName,
            columns: newColumns,
        },
    };
}

function cloneBoxNode(
    box: BoxNode,
    nodeIdMap: Map<string, string>,
    existingBoxes: BoxNode[],
    offset: { x: number; y: number },
): BoxNode {
    const newId = nodeIdMap.get(box.id);
    if (!newId) throw new Error(`clipboardActions: missing nodeIdMap entry for ${box.id}`);
    const newTitle = uniqueBoxTitle(existingBoxes, box.data.title);
    return {
        ...box,
        id: newId,
        selected: true,
        position: {
            x: box.position.x + offset.x,
            y: box.position.y + offset.y,
        },
        data: {
            ...box.data,
            title: newTitle,
        },
    };
}

/** Returns null when the edge's junction reference points at a non-copied node. */
function cloneEdge(
    edge: RelationEdge,
    nodeIdMap: Map<string, string>,
    columnIdMap: Map<string, string>,
): RelationEdge | null {
    const newSource = nodeIdMap.get(edge.source);
    const newTarget = nodeIdMap.get(edge.target);
    if (!newSource || !newTarget) return null;

    const oldData = edge.data;
    let newData: typeof edge.data = oldData;
    if (oldData) {
        let newJunctionTableId = oldData.junctionTableId;
        if (newJunctionTableId !== undefined) {
            const mapped = nodeIdMap.get(newJunctionTableId);
            if (!mapped) return null; // Drop edges whose junction isn't in the clipboard.
            newJunctionTableId = mapped;
        }
        newData = {
            ...oldData,
            sourceColumnId:
                columnIdMap.get(oldData.sourceColumnId) ?? oldData.sourceColumnId,
            targetColumnId:
                columnIdMap.get(oldData.targetColumnId) ?? oldData.targetColumnId,
            ...(oldData.autoCreatedColumnId !== undefined
                ? {
                    autoCreatedColumnId:
                        columnIdMap.get(oldData.autoCreatedColumnId) ??
                        oldData.autoCreatedColumnId,
                }
                : {}),
            ...(oldData.autoCreatedColumnNodeId !== undefined
                ? {
                    autoCreatedColumnNodeId:
                        nodeIdMap.get(oldData.autoCreatedColumnNodeId) ??
                        oldData.autoCreatedColumnNodeId,
                }
                : {}),
            ...(newJunctionTableId !== undefined
                ? { junctionTableId: newJunctionTableId }
                : {}),
        };
    }

    return {
        ...edge,
        id: crypto.randomUUID(),
        source: newSource,
        target: newTarget,
        sourceHandle: remapHandle(edge.sourceHandle, columnIdMap) ?? edge.sourceHandle,
        targetHandle: remapHandle(edge.targetHandle, columnIdMap) ?? edge.targetHandle,
        selected: false,
        data: newData,
    };
}

export function createClipboardActions(set: SetState): ClipboardActions {
    return {
        copySelection: () => {
            const { nodes, edges } = useDiagramStore.getState();
            const selectedNodes = nodes.filter((n) => n.selected);
            if (selectedNodes.length === 0) return;
            const selectedIds = new Set(selectedNodes.map((n) => n.id));
            const selectedEdges = edges.filter(
                (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
            );
            setClipboard({ nodes: selectedNodes, edges: selectedEdges });
        },

        pasteClipboard: (anchor?: { x: number; y: number }) =>
            set((draft) => {
                const payload = getClipboard();
                if (!payload || payload.nodes.length === 0) return;

                clearSelection(draft.nodes);

                const nodeIdMap = new Map<string, string>();
                const columnIdMap = new Map<string, string>();
                for (const n of payload.nodes) {
                    nodeIdMap.set(n.id, crypto.randomUUID());
                    if (isTableNode(n)) {
                        for (const c of n.data.columns) {
                            columnIdMap.set(c.id, crypto.randomUUID());
                        }
                    }
                }

                let offset: { x: number; y: number };
                if (anchor) {
                    let minX = Infinity;
                    let minY = Infinity;
                    let maxX = -Infinity;
                    let maxY = -Infinity;
                    for (const n of payload.nodes) {
                        const w =
                            typeof n.width === "number"
                                ? n.width
                                : n.measured?.width ??
                                LAYOUT.DEFAULT_NODE_WIDTH;
                        const h =
                            typeof n.height === "number"
                                ? n.height
                                : n.measured?.height ??
                                LAYOUT.DEFAULT_NODE_HEIGHT;
                        if (n.position.x < minX) minX = n.position.x;
                        if (n.position.y < minY) minY = n.position.y;
                        if (n.position.x + w > maxX) maxX = n.position.x + w;
                        if (n.position.y + h > maxY) maxY = n.position.y + h;
                    }
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    offset = { x: anchor.x - centerX, y: anchor.y - centerY };
                } else {
                    offset = { x: PASTE_OFFSET, y: PASTE_OFFSET };
                }

                const tablesSoFar = draft.nodes.filter(isTableNode) as TableNode[];
                const boxesSoFar = draft.nodes.filter(isBoxNode) as BoxNode[];

                for (const n of payload.nodes) {
                    if (isTableNode(n)) {
                        const clone = cloneTableNode(n, nodeIdMap, columnIdMap, tablesSoFar, offset);
                        draft.nodes.push(clone);
                        tablesSoFar.push(clone);
                    } else if (isBoxNode(n)) {
                        const clone = cloneBoxNode(n, nodeIdMap, boxesSoFar, offset);
                        draft.nodes.push(clone);
                        boxesSoFar.push(clone);
                    }
                }

                for (const e of payload.edges) {
                    const clone = cloneEdge(e, nodeIdMap, columnIdMap);
                    if (clone) draft.edges.push(clone);
                }
            }),
    };
}
