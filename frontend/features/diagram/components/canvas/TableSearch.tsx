"use client";

import { useMemo } from "react";
import { Table2 } from "lucide-react";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useDiagramStore } from "../../store/diagramStore";

interface TableSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (nodeId: string) => void;
}

export function TableSearch({ open, onOpenChange, onSelect }: TableSearchProps) {
    const nodes = useDiagramStore((s) => s.nodes);

    const tables = useMemo(
        () =>
            nodes
                .filter((n) => n.type === "tableNode")
                .map((n) => ({
                    id: n.id,
                    name: (n.data as { name?: string }).name ?? n.id,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [nodes],
    );

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Search tables"
            description="Jump to a table in the diagram"
        >
            <Command>
                <CommandInput placeholder="Search tables..." />
                <CommandList>
                    <CommandEmpty>No tables found.</CommandEmpty>
                    <CommandGroup heading="Tables">
                        {tables.map((t) => (
                            <CommandItem
                                key={t.id}
                                value={t.name}
                                onSelect={() => onSelect(t.id)}
                                className="gap-2"
                            >
                                <Table2 className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="font-mono text-sm">{t.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}
