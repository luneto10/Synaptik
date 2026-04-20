import { useCallback, useState } from "react";
import { refocusAndSelect } from "../utils/nameValidation";

export function useValidatedField<T extends HTMLInputElement>() {
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    const failValidation = useCallback((message: string, input: T | null) => {
        setError(message);
        refocusAndSelect(input);
    }, []);

    return {
        error,
        setError,
        clearError,
        failValidation,
    };
}
