"use client";

import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrainCircuit, Save, Loader2, Sun, Moon, Wand2, FlaskConical } from "lucide-react";
import { onInputCommit } from "../../utils/onInputCommit";
import { cn } from "@/lib/utils";

interface FlowToolbarProps {
    nodeCount: number;
    edgeCount: number;
    isPending: boolean;
    onSave: () => void;
    onAutoLayout: () => void;
    onLoadExample: () => void;
}

function FlowToolbar({ nodeCount, edgeCount, isPending, onSave, onAutoLayout, onLoadExample }: FlowToolbarProps) {
    const { theme, setTheme } = useTheme();
    const [projectName, setProjectName] = useState("untitled");
    const [editingName, setEditingName] = useState(false);

    return (
        <div className="h-11 border-b border-border/60 bg-card/95 backdrop-blur-sm flex items-center px-3 gap-2 shrink-0 z-10">
            {/* ── Brand ── */}
            <div className="flex items-center gap-1.5 select-none">
                <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
                    <BrainCircuit className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm text-foreground">Synaptik</span>
            </div>

            <Separator orientation="vertical" className="h-5 shrink-0" />

            {/* ── Project name ── */}
            {editingName ? (
                <Input
                    autoFocus
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => onInputCommit(e, { onCommit: () => setEditingName(false), onCancel: () => setEditingName(false) })}
                    className="h-6 w-28 text-xs px-2"
                />
            ) : (
                <button
                    onDoubleClick={() => setEditingName(true)}
                    title="Double-click to rename"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default select-none font-medium"
                >
                    {projectName}
                </button>
            )}

            <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                PostgreSQL
            </span>

            <Separator orientation="vertical" className="h-5 shrink-0" />

            {/* ── Tools ── */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onAutoLayout}>
                        <Wand2 className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Auto layout</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onLoadExample}>
                        <FlaskConical className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Load e-commerce example</TooltipContent>
            </Tooltip>

            {/* ── Right cluster ── */}
            <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-muted-foreground/60 tabular-nums">
                    {nodeCount} {nodeCount === 1 ? "table" : "tables"}
                    <span className="mx-1.5 opacity-40">·</span>
                    {edgeCount} {edgeCount === 1 ? "relation" : "relations"}
                </span>

                <Separator orientation="vertical" className="h-5 shrink-0" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>

                <Button
                    size="sm"
                    className={cn(
                        "h-7 text-xs px-3 gap-1.5 font-medium",
                        "bg-indigo-600 hover:bg-indigo-500 text-white",
                        "shadow-sm shadow-indigo-600/30 transition-all",
                    )}
                    onClick={onSave}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                </Button>
            </div>
        </div>
    );
}

export default memo(FlowToolbar);
