"use client";

import { Input } from "@/components/ui/input";
import InlineFieldError from "../components/common/InlineFieldError";
import { onInputCommitAndBlur } from "../utils/onInputCommit";

interface BoxTitleFieldProps {
    draftTitle: string;
    error: string | null;
    onTitleChange: (next: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onCommit: () => void;
    onCancel: () => void;
}

export function BoxTitleField({
    draftTitle,
    error,
    onTitleChange,
    onFocus,
    onBlur,
    onCommit,
    onCancel,
}: BoxTitleFieldProps) {
    return (
        <div className="flex-1">
            <Input
                value={draftTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={(e) =>
                    onInputCommitAndBlur(e, {
                        onCommit: () => {
                            onCommit();
                            return true;
                        },
                        onCancel: () => {
                            onCancel();
                            return true;
                        },
                    })
                }
                placeholder="Untitled category"
                className="h-8 w-64 text-base font-semibold border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
            <InlineFieldError message={error} compact className="px-1" />
        </div>
    );
}
