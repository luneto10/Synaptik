"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ColumnSettingsToggleRowProps {
    id: string;
    label: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (value: boolean) => void;
}

export function ColumnSettingsToggleRow({
    id,
    label,
    checked,
    disabled,
    onCheckedChange,
}: ColumnSettingsToggleRowProps) {
    return (
        <div className="flex items-center justify-between">
            <Label
                htmlFor={id}
                className="cursor-pointer text-xs text-muted-foreground"
            >
                {label}
            </Label>
            <Switch
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}
