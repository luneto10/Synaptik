"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineFieldErrorProps {
    id?: string;
    message?: string | null;
    className?: string;
    compact?: boolean;
}

export default function InlineFieldError({
    id,
    message,
    className,
    compact = false,
}: InlineFieldErrorProps) {
    if (!message) return null;

    return (
        <p
            id={id}
            role="alert"
            aria-live="polite"
            className={cn(
                compact
                    ? "mt-0.5 inline-flex items-center gap-1 text-[10px] leading-none text-destructive"
                    : "mt-1.5 inline-flex items-start gap-1.5 text-[11px] text-destructive",
                className,
            )}
        >
            <AlertCircle
                className={cn(
                    "shrink-0",
                    compact ? "h-2.5 w-2.5" : "mt-0.5 h-3 w-3",
                )}
            />
            <span>{message}</span>
        </p>
    );
}
