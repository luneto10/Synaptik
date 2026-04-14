export type ColumnType =
    | "uuid"
    | "text"
    | "varchar"
    | "int"
    | "bigint"
    | "boolean"
    | "timestamp"
    | "jsonb"
    | "float";

export interface DbColumn {
    id: string;
    name: string;
    type: ColumnType;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNullable: boolean;
    isUnique: boolean;
    references?: {
        tableId: string;
        columnId: string;
    };
}

export interface DbTable {
    id: string;
    name: string;
    columns: DbColumn[];
}
