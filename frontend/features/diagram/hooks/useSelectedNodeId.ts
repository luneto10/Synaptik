import { useShallow } from "zustand/shallow";
import { useDiagramStore } from "../store/diagramStore";
import type { TableNode } from "../types/flow.types";

/** Single selected node id (undefined when 0 or >1 selected). */
export function useSelectedNodeId(): string | undefined {
    return useDiagramStore((s) =>
        (s.nodes as TableNode[]).find((n) => n.selected)?.id,
    );
}

/** All selected node ids. Stable reference while the selection set is unchanged. */
export function useSelectedNodeIds(): string[] {
    return useDiagramStore(
        useShallow((s) =>
            (s.nodes as TableNode[]).filter((n) => n.selected).map((n) => n.id),
        ),
    );
}
