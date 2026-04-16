// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

afterEach(() => {
    cleanup();
});

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

    it("renders PK/FK badges when flags are enabled (unique hidden when PK)", () => {
        const col: DbColumn = {
            ...baseColumn,
            isPrimaryKey: true,
            isForeignKey: true,
            isUnique: true,
            references: { tableId: "users", columnId: "id" },
        };
        renderWithProvider(col);

        // type icon + text pills: PK, FK (unique is hidden when PK=true per component rules)
        expect(screen.getByText("PK")).toBeInTheDocument();
        expect(screen.getByText("FK")).toBeInTheDocument();
        expect(screen.queryByText("U")).not.toBeInTheDocument();
    });

    it("does not render unique badge when primary key is true", () => {
        const col: DbColumn = {
            ...baseColumn,
            isPrimaryKey: true,
            isUnique: true,
        };
        renderWithProvider(col);
        expect(screen.getAllByText("PK").length).toBeGreaterThan(0);
        expect(screen.queryByText("U")).not.toBeInTheDocument();
    });

    it("renders FK badge when references are present", () => {
        const col: DbColumn = {
            ...baseColumn,
            isForeignKey: true,
            references: { tableId: "abcdef123456", columnId: "id" },
        };
        renderWithProvider(col);
        expect(screen.getAllByText("FK").length).toBeGreaterThan(0);
    });
});
