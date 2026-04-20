export function isSelectAllShortcut(event: KeyboardEvent): boolean {
    return (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "a"
    );
}

export function isEditableTarget(target: EventTarget | null): boolean {
    const targetElement =
        target instanceof HTMLElement
            ? target
            : target instanceof Node
              ? target.parentElement
              : null;

    const activeElement =
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

    return [targetElement, activeElement].some((element) =>
        Boolean(
            element &&
            (element.isContentEditable ||
                element.closest(
                    [
                        "input",
                        "textarea",
                        "select",
                        '[contenteditable=""]',
                        '[contenteditable="true"]',
                        '[role="textbox"]',
                        '[role="combobox"]',
                        '[role="listbox"]',
                    ].join(", "),
                )),
        ),
    );
}
