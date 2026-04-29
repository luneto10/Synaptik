export type DiagramDialectId = "postgres" | "mysql";

export type ColumnType = string;

export interface ColumnTypeArguments {
    length?: number;
    precision?: number;
    scale?: number;
}

export interface DbColumn {
    id: string;
    name: string;
    type: ColumnType;
    typeOptions?: ColumnTypeArguments;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNullable: boolean;
    isUnique: boolean;
    isAutoIncrement?: boolean;
    references?: {
        tableId: string;
        columnId: string;
    };
}

export interface DbTable {
    id: string;
    name: string;
    columns: DbColumn[];
    isJunction?: boolean;
}
