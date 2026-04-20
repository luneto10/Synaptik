// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useValidatedField } from "../../../features/diagram/hooks/useValidatedField";

describe("useValidatedField", () => {
    it("sets and clears error state", () => {
        const { result } = renderHook(() => useValidatedField<HTMLInputElement>());

        act(() => {
            result.current.setError("bad value");
        });
        expect(result.current.error).toBe("bad value");

        act(() => {
            result.current.clearError();
        });
        expect(result.current.error).toBeNull();
    });

    it("fails validation and focuses the input", () => {
        const { result } = renderHook(() => useValidatedField<HTMLInputElement>());
        const input = document.createElement("input");
        document.body.appendChild(input);

        act(() => {
            result.current.failValidation("duplicate", input);
        });

        expect(result.current.error).toBe("duplicate");
    });
});
