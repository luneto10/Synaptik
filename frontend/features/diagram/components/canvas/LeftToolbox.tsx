"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    MousePointer2,
    Table2,
    Spline,
    RectangleHorizontal,
    Undo2,
    Redo2,
} from "lucide-react";

export type DiagramTool = "select" | "addTable" | "connect" | "areaSelect";

interface LeftToolboxProps {
    activeTool: DiagramTool;
    onToolChange: (tool: DiagramTool) => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

const TOOLS: {
    value: DiagramTool;
    icon: React.ReactNode;
    label: string;
    shortcut: string;
}[] = [
    {
        value: "select",
        icon: <MousePointer2 className="w-4 h-4" />,
        label: "Select",
        shortcut: "S",
    },
    {
        value: "addTable",
        icon: <Table2 className="w-4 h-4" />,
        label: "Add table",
        shortcut: "T",
    },
    {
        value: "connect",
        icon: <Spline className="w-4 h-4" />,
        label: "Connect",
        shortcut: "C",
    },
    {
        value: "areaSelect",
        icon: <RectangleHorizontal className="w-4 h-4" />,
        label: "Area select",
        shortcut: "A",
    },
];

function LeftToolbox({
    activeTool,
    onToolChange,
    onUndo,
    onRedo,
}: LeftToolboxProps) {
    return (
        <div
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                        flex flex-col items-center gap-1 p-1.5 rounded-xl
                        bg-card/95 backdrop-blur-sm border border-border shadow-lg"
        >
            <div className="flex flex-col gap-0.5">
                {TOOLS.map((tool) => (
                    <Tooltip key={tool.value}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onToolChange(tool.value)}
                                className={cn(
                                    "w-9 h-9 p-0 rounded-lg transition-colors",
                                    activeTool === tool.value
                                        ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/60 hover:bg-indigo-500/30"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                {tool.icon}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="right"
                            className="flex items-center gap-1.5"
                        >
                            {tool.label}
                            <kbd className="text-[10px] bg-background/20 text-background px-1.5 py-0.5 rounded font-mono border border-background/30">
                                {tool.shortcut}
                            </kbd>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>

            <Separator className="w-6 my-0.5" />

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        onClick={onUndo}
                        disabled={!onUndo}
                    >
                        <Undo2 className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="flex items-center gap-1.5"
                >
                    Undo
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        onClick={onRedo}
                        disabled={!onRedo}
                    >
                        <Redo2 className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="flex items-center gap-1.5"
                >
                    Redo
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export default memo(LeftToolbox);
