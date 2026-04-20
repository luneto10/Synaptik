// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BoxOpacitySection } from "../../../features/diagram/nodes/BoxOpacitySection";

describe("BoxOpacitySection", () => {
    it("emits slider updates", () => {
        const onOpacityChange = vi.fn();
        render(
            <BoxOpacitySection
                draftOpacity={0.5}
                onOpacityChange={onOpacityChange}
                onStartGesture={vi.fn()}
                onEndGesture={vi.fn()}
            />,
        );

        const slider = screen.getByRole("slider");
        fireEvent.change(slider, { target: { value: "0.75" } });
        expect(onOpacityChange).toHaveBeenCalledWith(0.75);
    });
});
