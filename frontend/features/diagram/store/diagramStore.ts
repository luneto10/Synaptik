import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import isEqual from "lodash/isEqual";
import type { DiagramState, SetState } from "./diagramStore.types";
import { createNodeActions } from "./nodeActions";
import { createEdgeActions } from "./edgeActions";
import { HISTORY_LIMIT } from "../constants";

// ── History snapshot ─────────────

type HistorySnapshot = {
    nodes: {
        id: string;
        position: { x: number; y: number };
        data: DiagramState["nodes"][number]["data"];
        type?: string;
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
        sourceHandle?: string | null;
        targetHandle?: string | null;
        data?: DiagramState["edges"][number]["data"];
    }[];
};

const EMPTY_SNAPSHOT: HistorySnapshot = { nodes: [], edges: [] };

const toSnapshot = (state: DiagramState | undefined): HistorySnapshot => {
    if (!state) return EMPTY_SNAPSHOT;
    return {
        nodes: state.nodes.map(({ id, position, data, type }) => ({
            id,
            position: { ...position },
            data,
            type,
        })),
        edges: state.edges.map(
            ({ id, source, target, sourceHandle, targetHandle, data }) => ({
                id,
                source,
                target,
                sourceHandle,
                targetHandle,
                data,
            }),
        ),
    };
};

// ── Store ──────────────────

export const useDiagramStore = create<DiagramState>()(
    temporal(
        immer<DiagramState>((set) => {
            const s = set as unknown as SetState;
            return {
                nodes: [],
                edges: [],
                ...createNodeActions(s),
                ...createEdgeActions(s),
            };
        }),
        {
            limit: HISTORY_LIMIT,
            partialize: toSnapshot,
            equality: (a, b) => isEqual(a, b),
        },
    ),
);
