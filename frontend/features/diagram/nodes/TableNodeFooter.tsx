"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";

interface TableNodeFooterProps {
    onAddColumn: () => void;
}

function TableNodeFooter({ onAddColumn }: TableNodeFooterProps) {
    return (
        <div className="flex flex-col">
            <Separator />
            <Button
                variant="ghost"
                size="sm"
                onClick={onAddColumn}
                className="w-full h-8 text-xs text-muted-foreground rounded-t-none rounded-b-xl
                   hover:text-indigo-500 hover:bg-indigo-500/10 gap-1"
            >
                <Plus className="w-3 h-3" />
                add column
            </Button>
        </div>
    );
}

export default memo(TableNodeFooter);
