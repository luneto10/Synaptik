"use client";

import { Trash2, Network } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { RelationshipType } from "../../types/flow.types";
import { SidePicker } from "../SidePicker";
import { RelationTypePicker } from "./RelationTypePicker";
import { getHandleSide } from "../../utils/handleIds";

interface Props {
    relType: RelationshipType;
    hasJunction: boolean;
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
    onTypeChange: (val: string) => void;
    onFlipSource: () => void;
    onFlipTarget: () => void;
    onDelete: () => void;
    onCreateJunction: () => void;
}

export function EdgePopoverContent({
    relType,
    hasJunction,
    sourceHandleId,
    targetHandleId,
    onTypeChange,
    onFlipSource,
    onFlipTarget,
    onDelete,
    onCreateJunction,
}: Props) {
    const sourceSide = getHandleSide(sourceHandleId, "source");
    const targetSide = getHandleSide(targetHandleId, "target");
    const hasSides = Boolean(sourceHandleId && targetHandleId);

    return (
        <>
            <p className="text-xs text-muted-foreground font-medium px-1">Relationship type</p>
            <RelationTypePicker value={relType} onValueChange={onTypeChange} />

            {relType === "many-to-many" && !hasJunction && (
                <>
                    <Separator />
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs gap-1.5"
                        onClick={onCreateJunction}
                    >
                        <Network className="w-3 h-3 text-indigo-400" />
                        Add junction table
                    </Button>
                </>
            )}

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
