"use client";

import { Button } from "@/components/ui/button";

interface Props {
    onCreateJunction: () => void;
    onKeepDirect: () => void;
    onCancel: () => void;
}

export function JunctionPrompt({ onCreateJunction, onKeepDirect, onCancel }: Props) {
    return (
        <div className="space-y-2 w-48">
            <p className="text-xs font-medium">Create junction table?</p>
            <p className="text-[10px] text-muted-foreground">
                A junction table lets you store extra data on the relationship.
            </p>
            <div className="flex gap-1">
                <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={onCreateJunction}
                >
                    Create table
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={onKeepDirect}>
                    Direct edge
                </Button>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="w-full h-6 text-[10px] text-muted-foreground"
                onClick={onCancel}
            >
                Cancel
            </Button>
        </div>
    );
}
