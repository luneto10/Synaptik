// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BoxTitleField } from "../../../features/diagram/nodes/BoxTitleField";

describe("BoxTitleField", () => {
    it("renders draft title and emits change", () => {
        const onTitleChange = vi.fn();
        render(
            <BoxTitleField
                draftTitle="Category A"
                error={null}
                onTitleChange={onTitleChange}
                onFocus={vi.fn()}
                onBlur={vi.fn()}
                onCommit={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        const input = screen.getByPlaceholderText("Untitled category");
        fireEvent.change(input, { target: { value: "Category B" } });
        expect(onTitleChange).toHaveBeenCalledWith("Category B");
    });
});
