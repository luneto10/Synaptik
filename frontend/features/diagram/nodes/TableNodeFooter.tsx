"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TableNodeFooterProps {
    onAddColumn: () => void;
}

function TableNodeFooter({ onAddColumn }: TableNodeFooterProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onAddColumn}
            className="w-full h-7 text-[11px] text-muted-foreground/60 rounded-none rounded-b-xl
                       border-t border-border/30
                       hover:text-indigo-400 hover:bg-indigo-500/8 gap-1.5 transition-colors"
        >
            <Plus className="w-3 h-3" />
            Add column
        </Button>
    );
}

export default memo(TableNodeFooter);
