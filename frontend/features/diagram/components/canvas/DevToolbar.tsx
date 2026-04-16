"use client";

import { useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDiagramStore } from "../../store/diagramStore";
import type { TableNode } from "../../types/flow.types";
import type { RelationEdge } from "../../types/flow.types";
import { FIT_VIEW_PADDING, REFLOW_DELAY_MS } from "../../constants";

interface Snapshot {
    nodes: TableNode[];
    edges: RelationEdge[];
}

export function DevToolbar() {
    const nodes = useDiagramStore((s) => s.nodes);
    const edges = useDiagramStore((s) => s.edges);
    const loadDiagram = useDiagramStore((s) => s.loadDiagram);
    const fileRef = useRef<HTMLInputElement>(null);
    const { fitView } = useReactFlow();

    const makeExportName = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        return `diagram-${y}${m}${d}-${hh}${mm}.json`;
    };

    function handleExport() {
        const snapshot: Snapshot = { nodes, edges };
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = makeExportName();
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset so the same file can be re-imported
        e.target.value = "";
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string) as Snapshot;
                if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
                    throw new Error("Invalid snapshot shape");
                }
                loadDiagram(data.nodes, data.edges);
                setTimeout(
                    () => fitView({ padding: FIT_VIEW_PADDING }),
                    REFLOW_DELAY_MS,
                );
            } catch (err) {
                console.error("[DevToolbar] Failed to load snapshot:", err);
                alert("Invalid diagram JSON — check the console for details.");
            }
        };
        reader.readAsText(file);
    }

    return (
        <>
            {/* Hidden file input */}
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

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={handleExport}
                    >
                        <Download className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Export diagram JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Import diagram JSON</TooltipContent>
            </Tooltip>
        </>
    );
}
