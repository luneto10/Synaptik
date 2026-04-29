import type { DiagramDialectDefinition } from "./types";

export const postgresDialect: DiagramDialectDefinition = {
    id: "postgres",
    label: "PostgreSQL",
    badgeLabel: "PostgreSQL",
    defaultColumnType: "text",
    defaultPrimaryKey: {
        type: "uuid",
    },
    types: [
        { id: "uuid", label: "uuid", semanticType: "uuid" },
        { id: "text", label: "text", semanticType: "text" },
        {
            id: "varchar",
            label: "varchar",
            semanticType: "varchar",
            argumentKind: "length",
            defaultArguments: { length: 255 },
        },
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
        {
            id: "bool",
            label: "bool",
            semanticType: "bool",
            aliases: ["boolean"],
        },
        { id: "timestamp", label: "timestamp", semanticType: "timestamp" },
        {
            id: "jsonb",
            label: "jsonb",
            semanticType: "json",
            aliases: ["json"],
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
