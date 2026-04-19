/** Convert a hex RGB string (3- or 6-digit) + alpha in [0, 1] to `rgba(...)`. */
export function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Parse a free-form hex string (with or without #, 3- or 6-digit) and return
 * a canonical 6-digit lowercase form like "#6366f1". Returns null for anything
 * that isn't a valid hex RGB triplet.
 */
export function normalizeHex(input: string): string | null {
    const raw = input.trim().replace(/^#/, "").toLowerCase();
    if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(raw)) return null;
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    return `#${full}`;
}
