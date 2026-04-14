"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

export default function LeftToolbox({
    activeTool,
    onToolChange,
    onUndo,
    onRedo,
}: LeftToolboxProps) {
    return (
        <div className="w-12 border-r border-border bg-card flex flex-col items-center py-3 gap-1 shrink-0">
            <ToggleGroup
                type="single"
                value={activeTool}
                onValueChange={(v) => v && onToolChange(v as DiagramTool)}
                className="flex flex-col gap-1"
            >
                {TOOLS.map((tool) => (
                    <Tooltip key={tool.value}>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem
                                value={tool.value}
                                aria-label={tool.label}
                                className="w-9 h-9 p-0 data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400"
                            >
                                {tool.icon}
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <span>
                                {tool.label}{" "}
                                <kbd className="ml-1 text-[10px] bg-muted px-1 rounded text-black">
                                    {tool.shortcut}
                                </kbd>
                            </span>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </ToggleGroup>

            <div className="mt-auto flex flex-col gap-1">
                <Separator className="my-1" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9"
                            onClick={onUndo}
                            disabled={!onUndo}
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Undo</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9"
                            onClick={onRedo}
                            disabled={!onRedo}
                        >
                            <Redo2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Redo</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
