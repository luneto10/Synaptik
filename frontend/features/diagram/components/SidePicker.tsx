"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidePickerProps {
    label: string;
    side: "left" | "right";
    onFlip: () => void;
}

export function SidePicker({ label, side, onFlip }: SidePickerProps) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground px-0.5">{label}</p>
            <div className="flex gap-1">
                <Button
                    size="sm"
                    variant={side === "left" ? "default" : "outline"}
                    className={cn("flex-1 h-6 text-[10px] px-1 gap-0.5", side === "left" && "bg-indigo-600 hover:bg-indigo-700 text-white")}
                    onClick={() => side !== "left" && onFlip()}
                >
                    <ArrowLeft className="w-2.5 h-2.5" /> L
                </Button>
                <Button
                    size="sm"
                    variant={side === "right" ? "default" : "outline"}
                    className={cn("flex-1 h-6 text-[10px] px-1 gap-0.5", side === "right" && "bg-indigo-600 hover:bg-indigo-700 text-white")}
                    onClick={() => side !== "right" && onFlip()}
                >
                    R <ArrowRight className="w-2.5 h-2.5" />
                </Button>
            </div>
        </div>
    );
}
