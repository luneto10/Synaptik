"use client";

import type { DbColumn } from "../types/db.types";
import { ColumnSettingsToggleRow } from "./ColumnSettingsToggleRow";

interface ColumnSettingsFlagTogglesProps {
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
}

export function ColumnSettingsFlagToggles({
    column,
    onUpdate,
}: ColumnSettingsFlagTogglesProps) {
    return (
        <>
            <ColumnSettingsToggleRow
                id={`pk-${column.id}`}
                label="Primary key"
                checked={column.isPrimaryKey}
                onCheckedChange={(checked) =>
                    onUpdate({
                        ...column,
                        isPrimaryKey: checked,
                        isUnique: checked ? true : column.isUnique,
                        isNullable: checked ? false : column.isNullable,
                    })
                }
            />
            <ColumnSettingsToggleRow
                id={`unique-${column.id}`}
                label="Unique"
                checked={column.isUnique}
                disabled={column.isPrimaryKey}
                onCheckedChange={(checked) =>
                    onUpdate({ ...column, isUnique: checked })
                }
            />
            <ColumnSettingsToggleRow
                id={`null-${column.id}`}
                label="Nullable"
                checked={column.isNullable}
                disabled={column.isPrimaryKey}
                onCheckedChange={(checked) =>
                    onUpdate({ ...column, isNullable: checked })
                }
            />
        </>
    );
}
