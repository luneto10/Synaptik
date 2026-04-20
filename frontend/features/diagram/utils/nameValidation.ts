import type { DbColumn } from "../types/db.types";
import type { BoxNode, TableNode } from "../types/flow.types";

export function normalizeName(value: string) {
    return value.trim().toLowerCase();
}

export function refocusAndSelect(input: HTMLInputElement | null) {
    requestAnimationFrame(() => {
        input?.focus();
        input?.select();
    });
}

export function hasDuplicateTableName(
    nodes: TableNode[],
    candidate: string,
    excludeNodeId?: string,
) {
    const normalized = normalizeName(candidate);
    if (!normalized) return false;
    return nodes.some(
        (node) =>
            node.id !== excludeNodeId &&
            normalizeName(node.data.name) === normalized,
    );
}

export function hasDuplicateCategoryTitle(
    boxes: BoxNode[],
    candidate: string,
    excludeNodeId?: string,
) {
    const normalized = normalizeName(candidate);
    if (!normalized) return false;
    return boxes.some(
        (box) =>
            box.id !== excludeNodeId &&
            normalizeName(box.data.title) === normalized,
    );
}

export function hasDuplicateColumnName(
    columns: DbColumn[],
    candidate: string,
    excludeColumnId?: string,
) {
    const normalized = normalizeName(candidate);
    if (!normalized) return false;
    return columns.some(
        (column) =>
            column.id !== excludeColumnId &&
            normalizeName(column.name) === normalized,
    );
}
