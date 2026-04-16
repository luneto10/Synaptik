// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConnectionDialog from "../../../features/diagram/components/edges/ConnectionDialog";

const mockDiagramState = {
    nodes: [
        {
            id: "users",
            type: "tableNode" as const,
            position: { x: 0, y: 0 },
            data: {
                id: "users",
                name: "Users",
                columns: [
                    {
                        id: "pk-users",
                        name: "id",
                        type: "uuid" as const,
                        isPrimaryKey: true,
                        isForeignKey: false,
                        isNullable: false,
                        isUnique: true,
                    },
                ],
            },
        },
        {
            id: "orders",
            type: "tableNode" as const,
            position: { x: 200, y: 0 },
            data: {
                id: "orders",
                name: "Orders",
                columns: [],
            },
        },
    ],
};

vi.mock("../../../features/diagram/store/diagramStore", () => ({
    useDiagramStore: Object.assign(
        (selector: (s: { nodes: typeof mockDiagramState.nodes }) => unknown) =>
            selector({ nodes: mockDiagramState.nodes }),
        {
            getState: () => ({ nodes: mockDiagramState.nodes }),
        },
    ),
}));

describe("ConnectionDialog", () => {
    it("renders selected source/target and default FK placeholder", () => {
        render(
            <ConnectionDialog
                open
                connection={{ source: "users", target: "orders", sourceHandle: null, targetHandle: null }}
                onConfirm={() => {}}
                onCancel={() => {}}
            />,
        );

        expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
        expect(screen.getAllByPlaceholderText("user_id").length).toBeGreaterThan(0);
    });

    it("allows editing the FK name input", () => {
        render(
            <ConnectionDialog
                open
                connection={{ source: "users", target: "orders", sourceHandle: null, targetHandle: null }}
                onConfirm={() => {}}
                onCancel={() => {}}
            />,
        );

        const input = screen.getAllByPlaceholderText("user_id")[0];
        fireEvent.change(input, { target: { value: "customer_id" } });
        expect((input as HTMLInputElement).value).toBe("customer_id");
    });
});
