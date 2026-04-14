// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ColumnBadges from "../../../features/diagram/nodes/ColumnBadges";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import { TooltipProvider } from "@/components/ui/tooltip";

const baseColumn: DbColumn = {
    id: "col-1",
    name: "title",
    type: "text",
    isPrimaryKey: false,
    isForeignKey: false,
    isNullable: true,
    isUnique: false,
};

describe("ColumnBadges", () => {
    const renderWithProvider = (column: DbColumn) =>
        render(
            <TooltipProvider>
                <ColumnBadges column={column} />
            </TooltipProvider>,
        );

    it("renders base type icon badge container", () => {
        const { container } = renderWithProvider(baseColumn);
        expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
    });

    it("renders PK/FK/Unique icons when flags are enabled", () => {
        const col: DbColumn = {
            ...baseColumn,
            isPrimaryKey: true,
            isForeignKey: true,
            isUnique: true,
            references: { tableId: "users", columnId: "id" },
        };
        const { container } = renderWithProvider(col);

        // type + pk + fk (unique is hidden when PK=true per component rules)
        expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
    });

    it("does not render unique icon when primary key is true", () => {
        const col: DbColumn = {
            ...baseColumn,
            isPrimaryKey: true,
            isUnique: true,
        };
        const { container } = renderWithProvider(col);
        expect(container.querySelectorAll("svg").length).toBe(2); // type + PK
    });

    it("renders FK badge safely when references are present", () => {
        const col: DbColumn = {
            ...baseColumn,
            isForeignKey: true,
            references: { tableId: "abcdef123456", columnId: "id" },
        };
        const { container } = renderWithProvider(col);
        expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2); // type + fk
    });
});
