import { BOX } from "../constants";
import { BOX_NODE_TYPE, isBoxNode, type BoxNode } from "../types/flow.types";
import type { DiagramState, SetState } from "./diagramStore.types";
import { findBox } from "./helpers";
import { hasDuplicateCategoryTitle } from "../utils/nameValidation";

type BoxActions = Pick<DiagramState, "addBox" | "updateBox">;

function clearSelection(nodes: DiagramState["nodes"]) {
    for (const node of nodes) {
        if (node.selected) node.selected = false;
    }
}

export function createBoxActions(set: SetState): BoxActions {
    return {
        addBox: (
            position: { x: number; y: number },
            size: { width: number; height: number },
            color?: string,
            opacity?: number,
        ) =>
            set((draft) => {
                clearSelection(draft.nodes);

                const box: BoxNode = {
                    id: crypto.randomUUID(),
                    type: BOX_NODE_TYPE,
                    position,
                    zIndex: -1,
                    selected: true,
                    width: Math.max(size.width, BOX.MIN_WIDTH),
                    height: Math.max(size.height, BOX.MIN_HEIGHT),
                    data: {
                        title: "",
                        color: color ?? BOX.DEFAULT_COLOR,
                        opacity: opacity ?? BOX.DEFAULT_OPACITY,
                    },
                };

                draft.nodes.unshift(box);
            }),

        updateBox: (
            nodeId: string,
            patch: Partial<{ title: string; color: string; opacity: number }>,
        ) =>
            set((draft) => {
                const node = findBox(draft.nodes, nodeId);
                if (!node) return;
                if (patch.title !== undefined) {
                    const trimmed = patch.title.trim();
                    if (
                        hasDuplicateCategoryTitle(
                            draft.nodes.filter(isBoxNode),
                            trimmed,
                            nodeId,
                        )
                    )
                        return;
                    node.data.title = trimmed;
                }
                if (patch.color !== undefined) node.data.color = patch.color;
                if (patch.opacity !== undefined)
                    node.data.opacity = patch.opacity;
            }),
    };
}
