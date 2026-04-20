import { describe, expect, it } from "vitest";
import { lightenHex, normalizeHex } from "../../../features/diagram/utils/color";

describe("lightenHex", () => {
    it("blends toward white", () => {
        expect(lightenHex("#000000", 1)).toBe("#ffffff");
        expect(lightenHex("#000000", 0.5)).toBe("#808080");
        expect(normalizeHex(lightenHex("#6366f1", 0.2)!)).toBeTruthy();
    });

    it("returns null for invalid input", () => {
        expect(lightenHex("not-a-color", 0.5)).toBeNull();
    });
});
