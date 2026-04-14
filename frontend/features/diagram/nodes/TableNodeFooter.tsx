"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";

interface TableNodeFooterProps {
    onAddColumn: () => void;
}

export default function TableNodeFooter({ onAddColumn }: TableNodeFooterProps) {
    return (
        <div className="flex flex-col">
            <Separator className="bg-slate-100" />
            <Button
                variant="ghost"
                size="sm"
                onClick={onAddColumn}
                className="w-full h-8 text-xs text-slate-400 rounded-t-none rounded-b-xl
                   hover:text-indigo-600 hover:bg-indigo-50 gap-1"
            >
                <Plus className="w-3 h-3" />
                add column
            </Button>
        </div>
    );
}
