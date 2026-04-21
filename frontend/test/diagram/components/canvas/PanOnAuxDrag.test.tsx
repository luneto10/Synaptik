// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { PanOnAuxDrag } from "../../../../features/diagram/components/canvas/PanOnAuxDrag";

const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }));
const mockSetViewport = vi.fn();

vi.mock("@xyflow/react", () => ({
    useReactFlow: () => ({
        getViewport: mockGetViewport,
        setViewport: mockSetViewport,
    }),
}));

describe("PanOnAuxDrag", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing", () => {
        const { container } = render(<PanOnAuxDrag />);
        expect(container.firstChild).toBeNull();
    });

    it("does not pan on left mouse button drag", () => {
        render(<PanOnAuxDrag />);

        const node = document.createElement("div");
        node.className = "react-flow__node";
        document.body.appendChild(node);

        node.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1 }),
        );
        node.dispatchEvent(
            new MouseEvent("mousemove", { bubbles: true, buttons: 1, clientX: 50, clientY: 50 }),
        );
        expect(mockSetViewport).not.toHaveBeenCalled();

        document.body.removeChild(node);
    });

    it("pans on middle mouse button drag over a node", () => {
        mockGetViewport.mockReturnValue({ x: 10, y: 20, zoom: 1 });
        render(<PanOnAuxDrag />);

        const node = document.createElement("div");
        node.className = "react-flow__node";
        document.body.appendChild(node);

        node.dispatchEvent(
            new MouseEvent("mousedown", {
                bubbles: true,
                button: 1,
                buttons: 4,
                clientX: 100,
                clientY: 100,
            }),
        );
        node.dispatchEvent(
            new MouseEvent("mousemove", {
                bubbles: true,
                buttons: 4,
                clientX: 150,
                clientY: 130,
            }),
        );

        expect(mockSetViewport).toHaveBeenCalledWith(
            { x: 60, y: 50, zoom: 1 },
            { duration: 0 },
        );

        document.body.removeChild(node);
    });
});
