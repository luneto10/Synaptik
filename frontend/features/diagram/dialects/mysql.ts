import type { DiagramDialectDefinition } from "./types";

export const mysqlDialect: DiagramDialectDefinition = {
    id: "mysql",
    label: "MySQL",
    badgeLabel: "MySQL",
    defaultColumnType: "varchar",
    defaultPrimaryKey: {
        type: "int",
        isAutoIncrement: true,
    },
    types: [
        { id: "uuid", label: "uuid", semanticType: "uuid" },
        {
            id: "char",
            label: "char",
            semanticType: "char",
            argumentKind: "length",
            defaultArguments: { length: 1 },
        },
        {
            id: "varchar",
            label: "varchar",
            semanticType: "varchar",
            argumentKind: "length",
            defaultArguments: { length: 255 },
        },
        { id: "text", label: "text", semanticType: "text" },
        {
            id: "int",
            label: "int",
            semanticType: "int",
            supportsAutoIncrement: true,
        },
        {
            id: "bigint",
            label: "bigint",
            semanticType: "bigint",
            supportsAutoIncrement: true,
        },
        { id: "bool", label: "bool", semanticType: "bool" },
        { id: "timestamp", label: "timestamp", semanticType: "timestamp" },
        {
            id: "json",
            label: "json",
            semanticType: "json",
            aliases: ["jsonb"],
        },
        {
            id: "decimal",
            label: "decimal",
            semanticType: "decimal",
            argumentKind: "precision-scale",
            defaultArguments: { precision: 10, scale: 2 },
        },
        { id: "float", label: "float", semanticType: "float" },
    ],
};
