"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { DbColumn } from "../types/db.types";
import {
    MAX_DECIMAL_PRECISION,
    MAX_DECIMAL_SCALE,
    MAX_STRING_TYPE_LENGTH,
    MIN_DECIMAL_PRECISION,
    MIN_DECIMAL_SCALE,
    MIN_STRING_TYPE_LENGTH,
    validateDecimalPrecision,
    validateDecimalScale,
    validateStringTypeLength,
} from "../dialects/typeOptionValidation";

interface UseColumnTypeOptionDraftsParams {
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
}

export function useColumnTypeOptionDrafts({
    column,
    onUpdate,
}: UseColumnTypeOptionDraftsParams) {
    const [lengthDraft, setLengthDraft] = useState(
        column.typeOptions?.length?.toString() ?? "",
    );
    const [precisionDraft, setPrecisionDraft] = useState(
        column.typeOptions?.precision?.toString() ?? "",
    );
    const [scaleDraft, setScaleDraft] = useState(
        column.typeOptions?.scale?.toString() ?? "",
    );
    const [lengthError, setLengthError] = useState<string | null>(null);
    const [decimalError, setDecimalError] = useState<string | null>(null);

    useEffect(() => {
        setLengthDraft(column.typeOptions?.length?.toString() ?? "");
    }, [column.type, column.typeOptions?.length]);

    useEffect(() => {
        setPrecisionDraft(column.typeOptions?.precision?.toString() ?? "");
    }, [column.type, column.typeOptions?.precision]);

    useEffect(() => {
        setScaleDraft(column.typeOptions?.scale?.toString() ?? "");
    }, [column.type, column.typeOptions?.scale]);

    const commitLength = () => {
        const trimmedValue = lengthDraft.trim();
        if (trimmedValue === "") {
            setLengthError(null);
            setLengthDraft(column.typeOptions?.length?.toString() ?? "");
            return;
        }

        const parsed = Number.parseInt(trimmedValue, 10);
        const error = validateStringTypeLength(parsed);
        if (error) {
            setLengthError(error);
            return;
        }

        setLengthError(null);
        onUpdate({
            ...column,
            typeOptions: { ...column.typeOptions, length: parsed },
        });
    };

    const commitPrecisionScale = () => {
        const trimmedPrecision = precisionDraft.trim();
        const trimmedScale = scaleDraft.trim();
        if (trimmedPrecision === "" || trimmedScale === "") {
            setDecimalError(null);
            setPrecisionDraft(column.typeOptions?.precision?.toString() ?? "");
            setScaleDraft(column.typeOptions?.scale?.toString() ?? "");
            return;
        }

        const precision = Number.parseInt(trimmedPrecision, 10);
        const scale = Number.parseInt(trimmedScale, 10);
        const precisionError = validateDecimalPrecision(precision);
        if (precisionError) {
            setDecimalError(precisionError);
            return;
        }

        const scaleError = validateDecimalScale(scale, precision);
        if (scaleError) {
            setDecimalError(scaleError);
            return;
        }

        setDecimalError(null);
        onUpdate({
            ...column,
            typeOptions: {
                ...column.typeOptions,
                precision,
                scale,
            },
        });
    };

    const handleLengthKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commitLength();
        }

        if (event.key === "Escape") {
            setLengthError(null);
            setLengthDraft(column.typeOptions?.length?.toString() ?? "");
            event.currentTarget.blur();
        }
    };

    const handleDecimalKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commitPrecisionScale();
        }

        if (event.key === "Escape") {
            setDecimalError(null);
            setPrecisionDraft(column.typeOptions?.precision?.toString() ?? "");
            setScaleDraft(column.typeOptions?.scale?.toString() ?? "");
            event.currentTarget.blur();
        }
    };

    return {
        lengthDraft,
        precisionDraft,
        scaleDraft,
        lengthError,
        decimalError,
        stringLimits: {
            min: MIN_STRING_TYPE_LENGTH,
            max: MAX_STRING_TYPE_LENGTH,
        },
        decimalLimits: {
            precisionMin: MIN_DECIMAL_PRECISION,
            precisionMax: MAX_DECIMAL_PRECISION,
            scaleMin: MIN_DECIMAL_SCALE,
            scaleMax: MAX_DECIMAL_SCALE,
        },
        setLengthDraft,
        setPrecisionDraft,
        setScaleDraft,
        commitLength,
        commitPrecisionScale,
        handleLengthKeyDown,
        handleDecimalKeyDown,
    };
}
