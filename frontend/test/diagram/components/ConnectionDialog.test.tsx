// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConnectionDialog from "../../../features/diagram/components/edges/ConnectionDialog";

vi.mock("../../../features/diagram/store/diagramStore", () => ({
    useDiagramStore: {
        getState: () => ({
            nodes: [
                {
                    id: "users",
                    type: "tableNode",
                    position: { x: 0, y: 0 },
                    data: {
                        id: "users",
                        name: "Users",
                        columns: [
                            {
                                id: "pk-users",
                                name: "id",
                                type: "uuid",
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
                    type: "tableNode",
                    position: { x: 200, y: 0 },
                    data: {
                        id: "orders",
                        name: "Orders",
                        columns: [],
                    },
                },
            ],
        }),
    },
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
        expect(screen.getAllByPlaceholderText("users_id").length).toBeGreaterThan(0);
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

        const input = screen.getAllByPlaceholderText("users_id")[0];
        fireEvent.change(input, { target: { value: "customer_id" } });
        expect((input as HTMLInputElement).value).toBe("customer_id");
    });
});
