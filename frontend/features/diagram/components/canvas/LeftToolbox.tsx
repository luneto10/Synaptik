"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
    MousePointer2,
    Table2,
    Spline,
    Undo2,
    Redo2,
    Focus,
} from "lucide-react";
import { useStore } from "zustand";
import { useDiagramStore } from "../../store/diagramStore";

export type DiagramTool = "select" | "addTable" | "connect";
export type DiagramToggle = "isolateConnections";
export type ToolValue = DiagramTool | DiagramToggle;

export type ToolDescriptor =
    | {
          kind: "tool";
          value: DiagramTool;
          icon: React.ReactNode;
          label: string;
          shortcut: string;
      }
    | {
          kind: "toggle";
          value: DiagramToggle;
          icon: React.ReactNode;
          label: string;
          shortcut: string;
      };

export const TOOLS: ToolDescriptor[] = [
    {
        kind: "tool",
        value: "select",
        icon: <MousePointer2 className="w-4 h-4" />,
        label: "Select",
        shortcut: "S",
    },
    {
        kind: "tool",
        value: "addTable",
        icon: <Table2 className="w-4 h-4" />,
        label: "Add table",
        shortcut: "T",
    },
    {
        kind: "tool",
        value: "connect",
        icon: <Spline className="w-4 h-4" />,
        label: "Connect",
        shortcut: "C",
    },
    {
        kind: "toggle",
        value: "isolateConnections",
        icon: <Focus className="w-4 h-4" />,
        label: "Isolate connections",
        shortcut: "F",
    },
];

interface LeftToolboxProps {
    activeTool: DiagramTool;
    toggles: Record<DiagramToggle, boolean>;
    onToolAction: (value: ToolValue) => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

function LeftToolbox({
    activeTool,
    toggles,
    onToolAction,
    onUndo,
    onRedo,
}: LeftToolboxProps) {
    const canUndo = useStore(
        useDiagramStore.temporal,
        (s) => s.pastStates.length > 0,
    );
    const canRedo = useStore(
        useDiagramStore.temporal,
        (s) => s.futureStates.length > 0,
    );

    return (
        <div
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                        flex flex-col items-center gap-0.5 p-1.5 rounded-xl
                        bg-card/90 backdrop-blur-md border border-border/60 shadow-lg shadow-black/10"
        >
            {TOOLS.map((tool) => {
                const active =
                    tool.kind === "tool"
                        ? activeTool === tool.value
                        : toggles[tool.value];
                return (
                    <Tooltip key={tool.value}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onToolAction(tool.value)}
                                aria-label={tool.label}
                                aria-pressed={
                                    tool.kind === "toggle" ? active : undefined
                                }
                                className={cn(
                                    "w-8 h-8 rounded-lg transition-all",
                                    active
                                        ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                )}
                            >
                                {tool.icon}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="right"
                            className="flex items-center gap-2"
                        >
                            {tool.label}
                            <kbd className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono border border-border">
                                {tool.shortcut}
                            </kbd>
                        </TooltipContent>
                    </Tooltip>
                );
            })}

            <div className="w-5 h-px bg-border/60 my-0.5" />

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Undo"
                        className={cn(
                            "w-8 h-8 rounded-lg transition-all",
                            canUndo
                                ? "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                : "text-muted-foreground/30 cursor-default",
                        )}
                        onClick={canUndo ? onUndo : undefined}
                        disabled={!canUndo}
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="flex items-center gap-2"
                >
                    Undo
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Redo"
                        className={cn(
                            "w-8 h-8 rounded-lg transition-all",
                            canRedo
                                ? "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                : "text-muted-foreground/30 cursor-default",
                        )}
                        onClick={canRedo ? onRedo : undefined}
                        disabled={!canRedo}
                    >
                        <Redo2 className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="flex items-center gap-2"
                >
                    Redo
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export default memo(LeftToolbox);
