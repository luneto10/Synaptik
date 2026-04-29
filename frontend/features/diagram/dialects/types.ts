import type { ColumnTypeArguments, DiagramDialectId } from "../types/db.types";

export type DiagramSemanticType =
    | "uuid"
    | "text"
    | "char"
    | "varchar"
    | "int"
    | "bigint"
    | "bool"
    | "timestamp"
    | "json"
    | "decimal"
    | "float";

export type ColumnArgumentKind = "length" | "precision-scale";

export interface DiagramDialectTypeDefinition {
    id: string;
    label: string;
    semanticType: DiagramSemanticType;
    argumentKind?: ColumnArgumentKind;
    supportsAutoIncrement?: boolean;
    aliases?: readonly string[];
    defaultArguments?: ColumnTypeArguments;
}

export interface DiagramDialectDefinition {
    id: DiagramDialectId;
    label: string;
    badgeLabel: string;
    defaultColumnType: string;
    defaultPrimaryKey: {
        type: string;
        typeOptions?: ColumnTypeArguments;
        isAutoIncrement?: boolean;
        isGeneratedUuid?: boolean;
    };
    types: readonly DiagramDialectTypeDefinition[];
}
