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

/** Blend hex RGB toward white (amount 0–1). Returns null if the input is not a valid hex triplet. */
export function lightenHex(input: string, amount: number): string | null {
    const n = normalizeHex(input);
    if (!n) return null;
    const h = n.slice(1);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const t = Math.min(1, Math.max(0, amount));
    const lr = Math.round(r + (255 - r) * t);
    const lg = Math.round(g + (255 - g) * t);
    const lb = Math.round(b + (255 - b) * t);
    const to = (x: number) => x.toString(16).padStart(2, "0");
    return `#${to(lr)}${to(lg)}${to(lb)}`;
}
