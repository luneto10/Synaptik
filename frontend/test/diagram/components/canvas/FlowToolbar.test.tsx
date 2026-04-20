// @vitest-environment happy-dom
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FlowToolbar from "../../../../features/diagram/components/canvas/FlowToolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock next-themes
vi.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: vi.fn(),
    }),
}));

const mockProps = {
    nodeCount: 5,
    edgeCount: 3,
    isPending: false,
    onSave: vi.fn(),
    onAutoLayout: vi.fn(),
    onLoadExample: vi.fn(),
    onSearch: vi.fn(),
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const renderToolbar = () =>
    render(
        <TooltipProvider>
            <FlowToolbar {...mockProps} />
        </TooltipProvider>,
    );

describe("FlowToolbar", () => {
    it("renders the initial project name", () => {
        renderToolbar();
        expect(screen.getByText("untitled")).toBeInTheDocument();
    });

    it("enters editing mode on double click", () => {
        renderToolbar();
        const button = screen.getByRole("button", { name: /rename project/i });
        fireEvent.doubleClick(button);
        
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue("untitled");
    });

    it("displays error message when project name is empty", () => {
        renderToolbar();
        const button = screen.getByRole("button", { name: /rename project/i });
        fireEvent.doubleClick(button);
        
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(screen.getByText("Project name cannot be empty")).toBeInTheDocument();
        expect(screen.getByRole("textbox")).toBeInTheDocument(); // Still in editing mode
    });

    it("commits the new name when valid", () => {
        renderToolbar();
        const button = screen.getByRole("button", { name: /rename project/i });
        fireEvent.doubleClick(button);
        
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "New Project" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        expect(screen.getByText("New Project")).toBeInTheDocument();
    });

    it("reverts to last valid name on Escape", () => {
        renderToolbar();
        const button = screen.getByRole("button", { name: /rename project/i });
        fireEvent.doubleClick(button);
        
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Invalid Change" } });
        fireEvent.keyDown(input, { key: "Escape" });

        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        expect(screen.getByText("untitled")).toBeInTheDocument();
    });

    it("validates on blur", () => {
        renderToolbar();
        const button = screen.getByRole("button", { name: /rename project/i });
        fireEvent.doubleClick(button);
        
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "" } });
        fireEvent.blur(input);

        expect(screen.getByText("Project name cannot be empty")).toBeInTheDocument();
    });
});
