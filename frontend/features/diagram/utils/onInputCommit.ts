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

/**
 * Enter / Escape helper that also blurs the current field by default.
 * Returning false from onCommit/onCancel prevents the blur.
 */
export function onInputCommitAndBlur(
    e: React.KeyboardEvent<HTMLInputElement>,
    {
        onCommit,
        onCancel,
    }: {
        onCommit: () => void | boolean;
        onCancel?: () => void | boolean;
    },
) {
    onInputCommit(e, {
        onCommit: () => {
            const shouldBlur = onCommit() !== false;
            if (shouldBlur) e.currentTarget.blur();
        },
        onCancel: onCancel
            ? () => {
                  const shouldBlur = onCancel() !== false;
                  if (shouldBlur) e.currentTarget.blur();
              }
            : undefined,
    });
}
