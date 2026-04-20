// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BoxColorSection } from "../../../features/diagram/nodes/BoxColorSection";

describe("BoxColorSection", () => {
    it("renders preset buttons and handles click", () => {
        const onColorChange = vi.fn();
        render(
            <BoxColorSection
                open={true}
                onOpenChange={vi.fn()}
                draftColor="#6366f1"
                editingHex={false}
                hexDraft="#6366f1"
                hexInputRef={{ current: null }}
                presets={["#111111", "#222222"]}
                onColorChange={onColorChange}
                onHexDraftChange={vi.fn()}
                onStartGesture={vi.fn()}
                onEndGesture={vi.fn()}
                onStartHexEdit={vi.fn()}
                onCommitHex={vi.fn()}
                onCancelHex={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Pick #111111" }));
        expect(onColorChange).toHaveBeenCalledWith("#111111");
    });
});
