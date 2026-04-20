import { describe, expect, it } from "vitest";
import { validateBoxTitle } from "../../../features/diagram/hooks/useBoxNodeEditorState";

describe("validateBoxTitle", () => {
    it("returns noop for empty values", () => {
        expect(validateBoxTitle("   ", "Current", false)).toEqual({
            status: "noop",
            value: "Current",
        });
    });

    it("returns duplicate when candidate already exists", () => {
        expect(validateBoxTitle("Billing", "Current", true)).toEqual({
            status: "duplicate",
        });
    });

    it("returns apply for unique trimmed value", () => {
        expect(validateBoxTitle("  Billing  ", "Current", false)).toEqual({
            status: "apply",
            value: "Billing",
        });
    });
});
