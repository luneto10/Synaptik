import type { DbColumn, DiagramDialectId } from "../types/db.types";
import { mysqlDialect } from "./mysql";
import { postgresDialect } from "./postgres";
import type {
    DiagramDialectDefinition,
    DiagramDialectTypeDefinition,
} from "./types";

const DIALECTS: Record<DiagramDialectId, DiagramDialectDefinition> = {
    postgres: postgresDialect,
    mysql: mysqlDialect,
};

export function listDiagramDialects(): DiagramDialectDefinition[] {
    return Object.values(DIALECTS);
}

export function getDiagramDialect(
    dialectId: DiagramDialectId,
): DiagramDialectDefinition {
    return DIALECTS[dialectId];
}

export function getDialectType(
    dialectId: DiagramDialectId,
    typeId: string,
): DiagramDialectTypeDefinition | undefined {
    const normalizedTypeId = typeId.trim().toLowerCase();
    return getDiagramDialect(dialectId).types.find(
        (typeDef) =>
            typeDef.id === normalizedTypeId ||
            typeDef.aliases?.includes(normalizedTypeId),
    );
}

function getTargetTypeBySemantic(
    dialectId: DiagramDialectId,
    semanticType: DiagramDialectTypeDefinition["semanticType"],
): DiagramDialectTypeDefinition {
    const targetType = getDiagramDialect(dialectId).types.find(
        (typeDef) => typeDef.semanticType === semanticType,
    );
    if (!targetType) {
        throw new Error(
            `Dialect ${dialectId} is missing semantic type ${semanticType}`,
        );
    }
    return targetType;
}

function normalizeTypeOptions(
    targetType: DiagramDialectTypeDefinition,
    currentOptions: DbColumn["typeOptions"],
): DbColumn["typeOptions"] {
    if (targetType.argumentKind === "length") {
        return {
            length:
                currentOptions?.length ??
                targetType.defaultArguments?.length ??
                255,
        };
    }

    if (targetType.argumentKind === "precision-scale") {
        return {
            precision:
                currentOptions?.precision ??
                targetType.defaultArguments?.precision ??
                10,
            scale:
                currentOptions?.scale ??
                targetType.defaultArguments?.scale ??
                2,
        };
    }

    return undefined;
}

export function formatColumnTypeLabel(
    dialectId: DiagramDialectId,
    column: Pick<DbColumn, "type" | "typeOptions">,
): string {
    const typeDef = getDialectType(dialectId, column.type);
    const baseLabel = typeDef?.label ?? column.type;
    const defaultLength = typeDef?.defaultArguments?.length;
    const defaultPrecision = typeDef?.defaultArguments?.precision;
    const defaultScale = typeDef?.defaultArguments?.scale;

    if (typeDef?.argumentKind === "length") {
        const length = column.typeOptions?.length ?? defaultLength;
        if (length) {
            return `${baseLabel}(${length})`;
        }
    }

    if (typeDef?.argumentKind === "precision-scale") {
        const precision = column.typeOptions?.precision ?? defaultPrecision;
        const scale = column.typeOptions?.scale ?? defaultScale;
        if (precision && scale !== undefined) {
            return `${baseLabel}(${precision},${scale})`;
        }
    }

    return baseLabel;
}

export function applyColumnTypeChange(
    dialectId: DiagramDialectId,
    column: DbColumn,
    nextTypeId: string,
): DbColumn {
    const nextTypeDef = getDialectType(dialectId, nextTypeId);

    return {
        ...column,
        type: nextTypeId,
        typeOptions: nextTypeDef?.defaultArguments,
        isAutoIncrement:
            nextTypeDef?.supportsAutoIncrement === true &&
            column.isAutoIncrement === true,
        isGeneratedUuid:
            nextTypeDef?.semanticType === "uuid" &&
            column.isGeneratedUuid === true,
    };
}

export function canConfigureAutoIncrement(
    column: Pick<DbColumn, "isForeignKey" | "type">,
    dialectId: DiagramDialectId,
): boolean {
    if (column.isForeignKey) {
        return false;
    }

    return getDialectType(dialectId, column.type)?.supportsAutoIncrement === true;
}

export function canConfigureGeneratedUuid(
    column: Pick<DbColumn, "isForeignKey" | "type">,
    dialectId: DiagramDialectId,
): boolean {
    if (column.isForeignKey) {
        return false;
    }

    return getDialectType(dialectId, column.type)?.semanticType === "uuid";
}

export function normalizeColumnTypeForDialect(
    column: DbColumn,
    sourceDialectId: DiagramDialectId,
    targetDialectId: DiagramDialectId,
): DbColumn {
    const sourceType =
        getDialectType(sourceDialectId, column.type) ??
        getDialectType(targetDialectId, column.type);

    if (!sourceType) {
        const fallbackType = getDiagramDialect(targetDialectId).defaultColumnType;
        return {
            ...column,
            type: fallbackType,
            isAutoIncrement: false,
            isGeneratedUuid: false,
            typeOptions: normalizeTypeOptions(
                getDialectType(targetDialectId, fallbackType) ?? {
                    id: fallbackType,
                    label: fallbackType,
                    semanticType: "text",
                },
                undefined,
            ),
        };
    }

    const targetType = getTargetTypeBySemantic(
        targetDialectId,
        sourceType.semanticType,
    );

    return {
        ...column,
        type: targetType.id,
        typeOptions: normalizeTypeOptions(targetType, column.typeOptions),
        isAutoIncrement:
            targetType.supportsAutoIncrement === true &&
            column.isAutoIncrement === true,
        isGeneratedUuid:
            targetType.semanticType === "uuid" &&
            sourceType.semanticType === "uuid" &&
            column.isGeneratedUuid === true,
    };
}
