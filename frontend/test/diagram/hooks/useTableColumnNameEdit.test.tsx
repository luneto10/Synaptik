// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTableColumnNameEdit } from "../../../features/diagram/hooks/useTableColumnNameEdit";
import type { DbColumn } from "../../../features/diagram/types/db.types";

function makeColumn(over: Partial<DbColumn> = {}): DbColumn {
    return {
        id: "c1",
        name: "id",
        type: "uuid",
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: true,
        ...over,
    };
}

describe("useTableColumnNameEdit", () => {
    it("openEditor seeds draft from the latest column.name", () => {
        const column = makeColumn({ name: "alpha", isPrimaryKey: false });
        const { result, rerender } = renderHook(
            ({ col }: { col: DbColumn }) =>
                useTableColumnNameEdit({
                    column: col,
                    hasDuplicateName: () => false,
                    onUpdate: vi.fn(),
                    onRemove: vi.fn(),
                }),
            { initialProps: { col: column } },
        );

        expect(result.current.draftName).toBe("alpha");

        rerender({ col: { ...column, name: "beta" } });
        expect(result.current.draftName).toBe("alpha");

        act(() => result.current.openEditor());
        expect(result.current.draftName).toBe("beta");
    });

    it("does not overwrite draft while editing", () => {
        const column = makeColumn({ name: "start", isPrimaryKey: false });
        const { result, rerender } = renderHook(
            ({ col }: { col: DbColumn }) =>
                useTableColumnNameEdit({
                    column: col,
                    hasDuplicateName: () => false,
                    onUpdate: vi.fn(),
                    onRemove: vi.fn(),
                }),
            { initialProps: { col: column } },
        );

        act(() => result.current.openEditor());
        act(() => result.current.handleDraftChange("user-edit"));

        rerender({ col: { ...column, name: "remote" } });
        expect(result.current.draftName).toBe("user-edit");
    });
});
