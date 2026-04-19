import type { DiagramNode, RelationEdge } from "../types/flow.types";

export interface ClipboardPayload {
    nodes: DiagramNode[];
    edges: RelationEdge[];
}

let clipboard: ClipboardPayload | null = null;

/** Deep-clone the payload on store so later mutations can't corrupt the clipboard. */
export function setClipboard(payload: ClipboardPayload): void {
    clipboard = structuredClone(payload);
}

/** Returns a fresh clone each call so callers can mutate freely without leaking back. */
export function getClipboard(): ClipboardPayload | null {
    return clipboard === null ? null : structuredClone(clipboard);
}

export function hasClipboardContent(): boolean {
    return clipboard !== null && clipboard.nodes.length > 0;
}

export function _resetClipboardForTests(): void {
    clipboard = null;
}
