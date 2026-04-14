"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrainCircuit, Save, Loader2, Sun, Moon, Wand2 } from "lucide-react";

interface FlowToolbarProps {
    nodeCount: number;
    edgeCount: number;
    isPending: boolean;
    onSave: () => void;
    onAutoLayout: () => void;
}

export default function FlowToolbar({
    nodeCount,
    edgeCount,
    isPending,
    onSave,
    onAutoLayout,
}: FlowToolbarProps) {
    const { theme, setTheme } = useTheme();
    const [projectName, setProjectName] = useState("untitled");
    const [editingName, setEditingName] = useState(false);

    return (
        <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 z-10">
            {/* ── Brand ── */}
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm select-none">
                <BrainCircuit className="w-4 h-4" />
                Synaptik
            </div>

            <Separator orientation="vertical" className="h-5 shrink-0" />

            {/* ── Project name ── */}
            {editingName ? (
                <Input
                    autoFocus
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape")
                            setEditingName(false);
                    }}
                    className="h-7 w-32 text-xs px-2 font-medium"
                />
            ) : (
                <button
                    onDoubleClick={() => setEditingName(true)}
                    title="Double-click to rename"
                    className="text-xs font-medium text-foreground hover:text-indigo-400 transition-colors cursor-default select-none"
                >
                    {projectName}
                </button>
            )}

            {/* ── DB type badge ── */}
            <Badge
                variant="secondary"
                className="text-[10px] font-mono px-1.5 py-0 h-5"
            >
                PostgreSQL
            </Badge>

            <Separator orientation="vertical" className="h-5 shrink-0" />

            {/* ── Auto layout ── */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onAutoLayout}
                    >
                        <Wand2 className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Auto layout</TooltipContent>
            </Tooltip>

            {/* ── Right cluster ── */}
            <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                    {nodeCount} table{nodeCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                    {edgeCount} relation{edgeCount !== 1 ? "s" : ""}
                </Badge>

                <Separator orientation="vertical" className="h-5 shrink-0" />

                {/* ── Theme toggle ── */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                        >
                            {theme === "dark" ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-5 shrink-0" />

                <Button
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                    onClick={onSave}
                    disabled={isPending || true}
                >
                    {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Save className="w-3 h-3" />
                    )}
                    save
                </Button>
            </div>
        </div>
    );
}
