"use client";

import { useMemo } from "react";
import { Table2, Layers } from "lucide-react";
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
import { isBoxNode, isTableNode } from "../../types/flow.types";

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
                .filter(isTableNode)
                .map((n) => ({ id: n.id, name: n.data.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [nodes],
    );

    const categories = useMemo(
        () =>
            nodes
                .filter(isBoxNode)
                .map((n) => ({
                    id: n.id,
                    name: n.data.title.trim() || "Untitled category",
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [nodes],
    );

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Search diagram"
            description="Jump to a table or category in the diagram"
        >
            <Command>
                <CommandInput placeholder="Search tables and categories..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {tables.length > 0 && (
                        <CommandGroup heading="Tables">
                            {tables.map((t) => (
                                <CommandItem
                                    key={t.id}
                                    value={`table:${t.name}`}
                                    onSelect={() => onSelect(t.id)}
                                    className="gap-2"
                                >
                                    <Table2 className="size-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-mono text-sm">{t.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {categories.length > 0 && (
                        <CommandGroup heading="Categories">
                            {categories.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    value={`category:${c.name}`}
                                    onSelect={() => onSelect(c.id)}
                                    className="gap-2"
                                >
                                    <Layers className="size-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm">{c.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </CommandDialog>
    );
}
