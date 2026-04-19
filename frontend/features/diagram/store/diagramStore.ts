import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import type { DiagramState, SetState } from "./diagramStore.types";
import { createNodeActions } from "./nodeActions";
import { createEdgeActions } from "./edgeActions";
import { createClipboardActions } from "./clipboardActions";
import { HISTORY_LIMIT } from "../constants";

// ── Store ──────────────────
// Snapshots store node/edge array references directly — safe because immer
// produces new object references on every mutation (structural sharing), so
// stored snapshots are never mutated after they are captured.

export const useDiagramStore = create<DiagramState>()(
    temporal(
        immer<DiagramState>((set) => {
            const s = set as unknown as SetState;
            return {
                nodes: [],
                edges: [],
                ...createNodeActions(s),
                ...createEdgeActions(s),
                ...createClipboardActions(s),
            };
        }),
        {
            limit: HISTORY_LIMIT,
            partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
            equality: (a, b) => a.nodes === b.nodes && a.edges === b.edges,
        },
    ),
);
