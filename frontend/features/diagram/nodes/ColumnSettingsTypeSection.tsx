"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import InlineFieldError from "../components/common/InlineFieldError";
import {
    applyColumnTypeChange,
    canConfigureAutoIncrement,
    canConfigureGeneratedUuid,
    getDiagramDialect,
    getDialectType,
} from "../dialects";
import type { DbColumn } from "../types/db.types";
import { ColumnSettingsToggleRow } from "./ColumnSettingsToggleRow";
import type { ColumnSettingsDialect } from "./ColumnSettingsPopover.types";
import { useColumnTypeOptionDrafts } from "./useColumnTypeOptionDrafts";

interface ColumnSettingsTypeSectionProps {
    column: DbColumn;
    dialect: ColumnSettingsDialect;
    onUpdate: (column: DbColumn) => void;
}

export function ColumnSettingsTypeSection({
    column,
    dialect,
    onUpdate,
}: ColumnSettingsTypeSectionProps) {
    const typeDef = getDialectType(dialect, column.type);
    const allTypes = getDiagramDialect(dialect).types;
    const showAutoIncrement = canConfigureAutoIncrement(column, dialect);
    const showGeneratedUuid = canConfigureGeneratedUuid(column, dialect);
    const drafts = useColumnTypeOptionDrafts({ column, onUpdate });

    return (
        <div className="space-y-2 border-t border-border pt-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Type
            </p>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                    Dialect type
                </Label>
                <Select
                    value={column.type}
                    onValueChange={(nextType) =>
                        onUpdate(applyColumnTypeChange(dialect, column, nextType))
                    }
                >
                    <SelectTrigger className="h-7 text-xs font-mono">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {allTypes.map((availableType) => (
                            <SelectItem
                                key={availableType.id}
                                value={availableType.id}
                                className="text-xs font-mono"
                            >
                                {availableType.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {typeDef?.argumentKind === "length" && (
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                        Length
                    </Label>
                    <input
                        type="number"
                        min={drafts.stringLimits.min}
                        max={drafts.stringLimits.max}
                        onPointerDown={(event) => event.stopPropagation()}
                        value={drafts.lengthDraft}
                        onChange={(event) =>
                            drafts.setLengthDraft(event.target.value)
                        }
                        onBlur={drafts.commitLength}
                        onKeyDown={drafts.handleLengthKeyDown}
                        className="nodrag nopan h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none"
                    />
                    <InlineFieldError message={drafts.lengthError} compact />
                </div>
            )}

            {typeDef?.argumentKind === "precision-scale" && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Precision
                        </Label>
                        <input
                            type="number"
                            min={drafts.decimalLimits.precisionMin}
                            max={drafts.decimalLimits.precisionMax}
                            onPointerDown={(event) => event.stopPropagation()}
                            value={drafts.precisionDraft}
                            onChange={(event) =>
                                drafts.setPrecisionDraft(event.target.value)
                            }
                            onBlur={drafts.commitPrecisionScale}
                            onKeyDown={drafts.handleDecimalKeyDown}
                            className="nodrag nopan h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Scale
                        </Label>
                        <input
                            type="number"
                            min={drafts.decimalLimits.scaleMin}
                            max={drafts.decimalLimits.scaleMax}
                            onPointerDown={(event) => event.stopPropagation()}
                            value={drafts.scaleDraft}
                            onChange={(event) =>
                                drafts.setScaleDraft(event.target.value)
                            }
                            onBlur={drafts.commitPrecisionScale}
                            onKeyDown={drafts.handleDecimalKeyDown}
                            className="nodrag nopan h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none"
                        />
                    </div>
                    <div className="col-span-2">
                        <InlineFieldError message={drafts.decimalError} compact />
                    </div>
                </div>
            )}

            {showAutoIncrement && (
                <ColumnSettingsToggleRow
                    id={`autoincrement-${column.id}`}
                    label="Auto increment"
                    checked={column.isAutoIncrement === true}
                    onCheckedChange={(checked) =>
                        onUpdate({
                            ...column,
                            isAutoIncrement: checked,
                            isGeneratedUuid: checked
                                ? false
                                : column.isGeneratedUuid,
                            isNullable: checked ? false : column.isNullable,
                        })
                    }
                />
            )}

            {showGeneratedUuid && (
                <ColumnSettingsToggleRow
                    id={`generated-uuid-${column.id}`}
                    label="Generate UUID"
                    checked={column.isGeneratedUuid === true}
                    onCheckedChange={(checked) =>
                        onUpdate({
                            ...column,
                            isGeneratedUuid: checked,
                            isAutoIncrement: checked
                                ? false
                                : column.isAutoIncrement,
                            isNullable: checked ? false : column.isNullable,
                        })
                    }
                />
            )}
        </div>
    );
}
