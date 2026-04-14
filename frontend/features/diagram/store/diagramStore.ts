import { create } from "zustand";
import { temporal } from "zundo";
import type { DiagramState } from "./diagramStore.types";
import { createNodeActions } from "./nodeActions";
import { createEdgeActions } from "./edgeActions";

export const useDiagramStore = create<DiagramState>()(
    temporal(
        (set) => ({
            nodes: [],
            edges: [],
            ...createNodeActions(set),
            ...createEdgeActions(set),
        }),
        { limit: 50 },
    ),
);
