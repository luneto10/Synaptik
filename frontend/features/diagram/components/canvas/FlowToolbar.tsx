"use client";

import { memo, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    BrainCircuit,
    Save,
    Loader2,
    Sun,
    Moon,
    Wand2,
    FlaskConical,
    Search,
} from "lucide-react";
import { onInputCommit } from "../../utils/onInputCommit";
import { cn } from "@/lib/utils";
import { DevToolbar } from "./DevToolbar";

/** Vertical rule for toolbars: avoids Radix Separator `self-stretch` fighting `h-*` in flex rows. */
function ToolbarDivider() {
    return (
        <span
            aria-hidden
            className="h-5 w-px shrink-0 self-center rounded-full bg-border"
        />
    );
}

interface FlowToolbarProps {
    nodeCount: number;
    edgeCount: number;
    isPending: boolean;
    onSave: () => void;
    onAutoLayout: () => void;
    onLoadExample: () => void;
    onSearch: () => void;
    isMac: boolean;
}

function FlowToolbar({
    nodeCount,
    edgeCount,
    isPending,
    onSave,
    onAutoLayout,
    onLoadExample,
    onSearch,
    isMac,
}: FlowToolbarProps) {
    const { theme, setTheme } = useTheme();
    const [projectName, setProjectName] = useState("untitled");
    const [editingName, setEditingName] = useState(false);
    const showDevTools = useMemo(
        () =>
            process.env.NODE_ENV === "development" ||
            process.env.NEXT_PUBLIC_DIAGRAM_DEV_TOOLS === "true",
        [],
    );

    return (
        <div className="h-11 border-b border-border/60 bg-card/95 backdrop-blur-sm flex items-center px-3 gap-2 shrink-0 z-10">
            {/* ── Brand ── */}
            <div className="flex items-center gap-1.5 select-none">
                <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
                    <BrainCircuit className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm text-foreground">
                    Synaptik
                </span>
            </div>

            <ToolbarDivider />

            {/* ── Project name ── */}
            {editingName ? (
                <Input
                    autoFocus
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) =>
                        onInputCommit(e, {
                            onCommit: () => setEditingName(false),
                            onCancel: () => setEditingName(false),
                        })
                    }
                    className="h-6 w-28 text-xs px-2"
                />
            ) : (
                <button
                    onDoubleClick={() => setEditingName(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "F2") {
                            e.preventDefault();
                            setEditingName(true);
                        }
                    }}
                    title="Double-click to rename"
                    aria-label="Rename project"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default select-none font-medium"
                >
                    {projectName}
                </button>
            )}

            <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                PostgreSQL
            </span>

            <ToolbarDivider />

            {/* ── Tools ── */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={onAutoLayout}
                        aria-label="Auto layout diagram"
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Auto layout</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={onLoadExample}
                        aria-label="Load e-commerce example"
                    >
                        <FlaskConical className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Load e-commerce example</TooltipContent>
            </Tooltip>

            {showDevTools && (
                <>
                    <ToolbarDivider />
                    <div className="flex items-center gap-1">
                        <DevToolbar />
                    </div>
                </>
            )}

            {/* ── Right cluster ── */}
            <div className="ml-auto flex items-center gap-3">
                {/* ── Search trigger ── */}
                <button
                    type="button"
                    onClick={onSearch}
                    className={cn(
                        "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs",
                        "text-muted-foreground border border-border/60 bg-muted/40",
                        "hover:bg-muted hover:text-foreground hover:border-border transition-colors",
                        "select-none shrink-0",
                    )}
                >
                    <Search className="w-3 h-3 shrink-0" />
                    <span className="hidden sm:inline">Search tables</span>
                    <kbd className="ml-0.5 flex items-center gap-0.5 font-mono text-[10px] opacity-60">
                        <span>{isMac ? "⌘" : "Ctrl"}</span>
                        <span>K</span>
                    </kbd>
                </button>

                <ToolbarDivider />

                <span className="text-xs text-muted-foreground/60 tabular-nums">
                    {nodeCount} {nodeCount === 1 ? "table" : "tables"}
                    <span className="mx-1.5 opacity-40">·</span>
                    {edgeCount} {edgeCount === 1 ? "relation" : "relations"}
                </span>

                <ToolbarDivider />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? (
                                <Sun className="w-3.5 h-3.5" />
                            ) : (
                                <Moon className="w-3.5 h-3.5" />
                            )}
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
                    {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Save className="w-3 h-3" />
                    )}
                    Save
                </Button>
            </div>
        </div>
    );
}

export default memo(FlowToolbar);
