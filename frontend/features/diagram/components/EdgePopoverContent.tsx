"use client";

import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RelationshipType } from "../types/flow.types";
import { RELATION_LABELS } from "../constants";

interface Props {
    relType: RelationshipType;
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
    onTypeChange: (val: string) => void;
    onFlipSource: () => void;
    onFlipTarget: () => void;
    onDelete: () => void;
}

export function EdgePopoverContent({
    relType,
    sourceHandleId,
    targetHandleId,
    onTypeChange,
    onFlipSource,
    onFlipTarget,
    onDelete,
}: Props) {
    const sourceSide = sourceHandleId?.endsWith("-source-left") ? "left" : "right";
    const targetSide = targetHandleId?.endsWith("-target-right") ? "right" : "left";
    const hasSides = Boolean(sourceHandleId && targetHandleId);

    return (
        <>
            <p className="text-xs text-muted-foreground font-medium px-1">Relationship type</p>
            <ToggleGroup type="single" value={relType} onValueChange={onTypeChange} className="gap-1">
                {(Object.keys(RELATION_LABELS) as RelationshipType[]).map((v) => (
                    <ToggleGroupItem
                        key={v}
                        value={v}
                        className="text-xs h-7 px-2 font-mono data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400"
                    >
                        {RELATION_LABELS[v]}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            {hasSides && (
                <>
                    <Separator />
                    <p className="text-xs text-muted-foreground font-medium px-1">Connection sides</p>
                    <div className="grid grid-cols-2 gap-2">
                        <SidePicker label="Source" side={sourceSide} onFlip={onFlipSource} />
                        <SidePicker label="Target" side={targetSide} onFlip={onFlipTarget} />
                    </div>
                </>
            )}

            <Separator />
            <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={onDelete}
            >
                <Trash2 className="w-3 h-3" />
                Delete relation
            </Button>
        </>
    );
}

// ── Internal helper ────────────────────────────────────────────────────────────

function SidePicker({
    label,
    side,
    onFlip,
}: {
    label: string;
    side: "left" | "right";
    onFlip: () => void;
}) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground px-0.5">{label}</p>
            <div className="flex gap-1">
                <Button
                    size="sm"
                    variant={side === "left" ? "default" : "outline"}
                    className={`flex-1 h-6 text-[10px] px-1 gap-0.5 ${side === "left" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                    onClick={() => side !== "left" && onFlip()}
                >
                    <ArrowLeft className="w-2.5 h-2.5" /> L
                </Button>
                <Button
                    size="sm"
                    variant={side === "right" ? "default" : "outline"}
                    className={`flex-1 h-6 text-[10px] px-1 gap-0.5 ${side === "right" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                    onClick={() => side !== "right" && onFlip()}
                >
                    R <ArrowRight className="w-2.5 h-2.5" />
                </Button>
            </div>
        </div>
    );
}
