import { describe, expect, it, vi } from "vitest";
import { onInputCommit } from "../../../features/diagram/utils/onInputCommit";

function makeKeyboardEvent(key: string) {
    const preventDefault = vi.fn();
    return {
        key,
        preventDefault,
    } as unknown as React.KeyboardEvent;
}

describe("onInputCommit", () => {
    it("calls onCommit on Enter and prevents default", () => {
        const onCommit = vi.fn();
        const onCancel = vi.fn();
        const e = makeKeyboardEvent("Enter");

        onInputCommit(e, { onCommit, onCancel });

        expect(e.preventDefault).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it("calls onCancel on Escape and prevents default", () => {
        const onCommit = vi.fn();
        const onCancel = vi.fn();
        const e = makeKeyboardEvent("Escape");

        onInputCommit(e, { onCommit, onCancel });

        expect(e.preventDefault).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCommit).not.toHaveBeenCalled();
    });

    it("does nothing for unrelated keys", () => {
        const onCommit = vi.fn();
        const onCancel = vi.fn();
        const e = makeKeyboardEvent("a");

        onInputCommit(e, { onCommit, onCancel });

        expect(e.preventDefault).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
    });
});
