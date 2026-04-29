export const MIN_STRING_TYPE_LENGTH = 1;
export const MAX_STRING_TYPE_LENGTH = 65535;
export const MIN_DECIMAL_PRECISION = 1;
export const MAX_DECIMAL_PRECISION = 65;
export const MIN_DECIMAL_SCALE = 0;
export const MAX_DECIMAL_SCALE = 30;

export function validateStringTypeLength(value: number): string | null {
    if (!Number.isInteger(value)) {
        return "Length must be an integer.";
    }

    if (value < MIN_STRING_TYPE_LENGTH || value > MAX_STRING_TYPE_LENGTH) {
        return `Length must be between ${MIN_STRING_TYPE_LENGTH} and ${MAX_STRING_TYPE_LENGTH}.`;
    }

    return null;
}

export function validateDecimalPrecision(value: number): string | null {
    if (!Number.isInteger(value)) {
        return "Precision must be an integer.";
    }

    if (value < MIN_DECIMAL_PRECISION || value > MAX_DECIMAL_PRECISION) {
        return `Precision must be between ${MIN_DECIMAL_PRECISION} and ${MAX_DECIMAL_PRECISION}.`;
    }

    return null;
}

export function validateDecimalScale(
    scale: number,
    precision: number,
): string | null {
    if (!Number.isInteger(scale)) {
        return "Scale must be an integer.";
    }

    if (scale < MIN_DECIMAL_SCALE || scale > MAX_DECIMAL_SCALE) {
        return `Scale must be between ${MIN_DECIMAL_SCALE} and ${MAX_DECIMAL_SCALE}.`;
    }

    if (scale > precision) {
        return "Scale cannot be greater than precision.";
    }

    return null;
}
