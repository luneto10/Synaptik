"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RelationshipType } from "../../types/flow.types";
import { RELATION_LABELS } from "../../constants";

interface RelationTypePickerProps {
    value: RelationshipType;
    onValueChange: (v: string) => void;
    /** When true, each option renders stacked (label + hint) in a grid. Used in ConnectionDialog. */
    withHints?: boolean;
}

const HINTS: Record<RelationshipType, string> = {
    "one-to-one": "One to One",
    "one-to-many": "One to Many",
    "many-to-many": "Many to Many",
};

export function RelationTypePicker({ value, onValueChange, withHints }: RelationTypePickerProps) {
    return (
        <ToggleGroup
            type="single"
            value={value}
            onValueChange={onValueChange}
            className={withHints ? "grid grid-cols-3 gap-1" : "gap-1"}
        >
            {(Object.keys(RELATION_LABELS) as RelationshipType[]).map((v) => (
                <ToggleGroupItem
                    key={v}
                    value={v}
                    className={
                        withHints
                            ? "flex flex-col h-14 data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400 data-[state=on]:border-indigo-500 border rounded-lg"
                            : "text-xs h-7 px-2 font-mono data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400"
                    }
                >
                    <span className={withHints ? "font-mono font-bold text-sm" : undefined}>
                        {RELATION_LABELS[v]}
                    </span>
                    {withHints && (
                        <span className="text-[10px] text-muted-foreground">{HINTS[v]}</span>
                    )}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
