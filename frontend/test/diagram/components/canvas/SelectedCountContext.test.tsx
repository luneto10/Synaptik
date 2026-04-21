// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    SelectedCountContext,
    useSelectedCount,
} from "@/features/diagram/components/canvas/SelectedCountContext";

describe("useSelectedCount", () => {
    it("returns 0 when used outside a provider", () => {
        const { result } = renderHook(() => useSelectedCount());
        expect(result.current).toBe(0);
    });

    it("returns the value supplied by the nearest provider", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SelectedCountContext.Provider value={3}>
                {children}
            </SelectedCountContext.Provider>
        );
        const { result } = renderHook(() => useSelectedCount(), { wrapper });
        expect(result.current).toBe(3);
    });

    it("re-renders when the provider value changes", () => {
        let count = 1;
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SelectedCountContext.Provider value={count}>
                {children}
            </SelectedCountContext.Provider>
        );
        const { result, rerender } = renderHook(() => useSelectedCount(), {
            wrapper,
        });
        expect(result.current).toBe(1);
        count = 5;
        rerender();
        expect(result.current).toBe(5);
    });
});
