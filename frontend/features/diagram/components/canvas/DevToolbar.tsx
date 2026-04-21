"use client";

import { useCallback, useRef } from "react";
import { Download, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "../../store/diagramStore";
import type { DiagramNode, RelationEdge } from "../../types/flow.types";
import stressData from "../../mock/stress.json";
import { FIT_VIEW_PADDING } from "../../constants";
import { useDeferredFitView } from "../../hooks/useDeferredFitView";
import { createPersistedDiagramSnapshot } from "../../utils/diagramSnapshot";

interface Snapshot {
    nodes: DiagramNode[];
    edges: RelationEdge[];
}

function makeExportName() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `diagram-${y}${m}${d}-${hh}${mm}.json`;
}

export function DevToolbar() {
    const fileRef = useRef<HTMLInputElement>(null);
    const { deferredFitView } = useDeferredFitView();

    const handleExport = useCallback(() => {
        const { nodes, edges } = useDiagramStore.getState();
        const snapshot: Snapshot = createPersistedDiagramSnapshot(nodes, edges);
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = makeExportName();
        anchor.click();
        URL.revokeObjectURL(url);
    }, []);

    const handleImportFile = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            event.target.value = "";
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                try {
                    const snapshot = JSON.parse(
                        loadEvent.target?.result as string,
                    ) as Snapshot;

                    if (
                        !Array.isArray(snapshot.nodes) ||
                        !Array.isArray(snapshot.edges)
                    ) {
                        throw new Error("Invalid snapshot shape");
                    }

                    void useDiagramStore
                        .getState()
                        .loadDiagramAdaptive(snapshot.nodes, snapshot.edges)
                        .then(() => {
                            deferredFitView({ padding: FIT_VIEW_PADDING });
                        });
                } catch (err) {
                    console.error("[DevToolbar] Failed to load snapshot:", err);
                    alert("Invalid diagram JSON - check the console for details.");
                }
            };
            reader.readAsText(file);
        },
        [deferredFitView],
    );

    const openImportPicker = useCallback(() => {
        fileRef.current?.click();
    }, []);

    const handleLoadStress = useCallback(() => {
        const { nodes, edges } = stressData as Snapshot;
        void useDiagramStore
            .getState()
            .loadDiagramAdaptive(nodes, edges)
            .then(() => {
                deferredFitView({ padding: FIT_VIEW_PADDING });
            });
    }, [deferredFitView]);

    return (
        <>
            <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
            />

            <span className="text-[10px] font-mono font-semibold tracking-widest text-amber-500/70 select-none uppercase">
                dev
            </span>

            <Button
                variant="ghost"
                size="icon"
                title="Export diagram JSON"
                aria-label="Export diagram JSON"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleExport}
            >
                <Download className="h-3.5 w-3.5" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                title="Import diagram JSON"
                aria-label="Import diagram JSON"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={openImportPicker}
            >
                <Upload className="h-3.5 w-3.5" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                title="Load stress test"
                aria-label="Load stress test"
                className="h-7 w-7 text-amber-500/70 hover:text-amber-400"
                onClick={handleLoadStress}
            >
                <Zap className="h-3.5 w-3.5" />
            </Button>
        </>
    );
}
