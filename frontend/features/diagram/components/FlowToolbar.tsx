"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TableProperties, Save, Loader2 } from "lucide-react";

interface FlowToolbarProps {
    nodeCount: number;
    edgeCount: number;
    isPending: boolean;
    onNewTable: () => void;
    onSave: () => void;
}

export default function FlowToolbar({
    nodeCount,
    edgeCount,
    isPending,
    onNewTable,
    onSave,
}: FlowToolbarProps) {
    return (
        <div className="h-12 border-b border-slate-200 bg-white flex items-center px-4 gap-3 shrink-0">
            {/* ── Brand ── */}
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                <TableProperties className="w-4 h-4" />
                Synaptik
            </div>

            <Separator orientation="vertical" className="h-5" />

            {/* ── Actions ── */}
            <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onNewTable}
            >
                + new table
            </Button>

            {/* ── Stats ── */}
            <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                    {nodeCount} table{nodeCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                    {edgeCount} relation{edgeCount !== 1 ? "s" : ""}
                </Badge>

                <Separator orientation="vertical" className="h-5" />

                <Button
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                    onClick={onSave}
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                        <Save className="w-3 h-3 mr-1" />
                    )}
                    save
                </Button>
            </div>
        </div>
    );
}
