/**
 * Standard Enter / Escape handler for rename/create inputs throughout the diagram.
 * - Enter  → commit the value (and optionally blur the input)
 * - Escape → cancel / close
 */
export function onInputCommit(
    e: React.KeyboardEvent,
    { onCommit, onCancel }: { onCommit: () => void; onCancel?: () => void },
) {
    if (e.key === "Enter") {
        e.preventDefault();
        onCommit();
    } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
    }
}
