// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConnectionDialog from "../../../features/diagram/components/edges/ConnectionDialog";

const mockNodes = [
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
        data: { id: "orders", name: "Orders", columns: [] },
    },
];

vi.mock("../../../features/diagram/store/diagramStore", () => ({
    useDiagramStore: Object.assign(
        (selector: (s: { nodes: typeof mockNodes }) => unknown) =>
            selector({ nodes: mockNodes }),
        { getState: () => ({ nodes: mockNodes }) },
    ),
}));

const defaultProps = {
    open: true,
    connection: { source: "users", target: "orders", sourceHandle: null, targetHandle: null },
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
};

afterEach(() => cleanup());

function renderDialog(overrides?: Partial<typeof defaultProps>) {
    const props = { ...defaultProps, onConfirm: vi.fn(), onCancel: vi.fn(), ...overrides };
    render(<ConnectionDialog {...props} />);
    return props;
}

describe("ConnectionDialog", () => {
    it("renders source and target table names with default FK placeholder", () => {
        renderDialog();
        expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
        expect(screen.getByPlaceholderText("user_id")).toBeInTheDocument();
    });

    it("allows editing the FK name input", () => {
        renderDialog();
        const input = screen.getByPlaceholderText("user_id");
        fireEvent.change(input, { target: { value: "customer_id" } });
        expect((input as HTMLInputElement).value).toBe("customer_id");
    });

    it("calls onCancel when Cancel button is clicked", () => {
        const { onCancel } = renderDialog();
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm with correct args when form is submitted", async () => {
        const { onConfirm } = renderDialog();
        const form = document.querySelector("form")!;
        fireEvent.submit(form);
        await waitFor(() =>
            expect(onConfirm).toHaveBeenCalledWith("one-to-many", "user_id", false),
        );
    });

    it("shows junction toggle section when many-to-many is selected", () => {
        renderDialog();
        expect(screen.queryByText(/auto-create junction table/i)).not.toBeInTheDocument();
        fireEvent.click(screen.getByText("N : M"));
        expect(screen.getByText(/auto-create junction table/i)).toBeInTheDocument();
    });

    it("hides the FK name input when many-to-many is selected", () => {
        renderDialog();
        expect(screen.getByPlaceholderText("user_id")).toBeInTheDocument();
        fireEvent.click(screen.getByText("N : M"));
        expect(screen.queryByPlaceholderText("user_id")).not.toBeInTheDocument();
    });

    it("renders nothing when source node is missing", () => {
        render(
            <ConnectionDialog
                open
                connection={{ source: "nonexistent", target: "orders", sourceHandle: null, targetHandle: null }}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect(screen.queryByText("Define relationship")).not.toBeInTheDocument();
    });
});
