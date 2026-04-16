// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ColumnBadges from "../../../features/diagram/nodes/ColumnBadges";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import { TooltipProvider } from "@/components/ui/tooltip";

const base: DbColumn = {
    id: "col-1",
    name: "title",
    type: "text",
    isPrimaryKey: false,
    isForeignKey: false,
    isNullable: false,
    isUnique: false,
};

afterEach(() => cleanup());

const wrap = (column: DbColumn) =>
    render(
        <TooltipProvider>
            <ColumnBadges column={column} />
        </TooltipProvider>,
    );

describe("ColumnBadges", () => {
    it("renders a type icon for every column", () => {
        const { container } = wrap(base);
        expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
    });

    it("shows PK and FK badges; hides U when isPrimaryKey is true", () => {
        wrap({ ...base, isPrimaryKey: true, isForeignKey: true, isUnique: true, references: { tableId: "users", columnId: "id" } });
        expect(screen.getByText("PK")).toBeInTheDocument();
        expect(screen.getByText("FK")).toBeInTheDocument();
        expect(screen.queryByText("U")).not.toBeInTheDocument();
    });

    it("shows U badge when isUnique is true and isPrimaryKey is false", () => {
        wrap({ ...base, isUnique: true });
        expect(screen.getByText("U")).toBeInTheDocument();
        expect(screen.queryByText("PK")).not.toBeInTheDocument();
    });

    it("shows ? badge when isNullable is true", () => {
        wrap({ ...base, isNullable: true });
        expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("shows no badges for a plain non-key column", () => {
        wrap(base);
        expect(screen.queryByText("PK")).not.toBeInTheDocument();
        expect(screen.queryByText("FK")).not.toBeInTheDocument();
        expect(screen.queryByText("U")).not.toBeInTheDocument();
        expect(screen.queryByText("?")).not.toBeInTheDocument();
    });

    it("renders FK badge when isForeignKey is true", () => {
        wrap({ ...base, isForeignKey: true, references: { tableId: "users", columnId: "id" } });
        expect(screen.getByText("FK")).toBeInTheDocument();
    });
});
