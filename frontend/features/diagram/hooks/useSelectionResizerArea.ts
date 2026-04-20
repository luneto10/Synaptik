import { useEffect, useRef, useState } from "react";

function getNextAreaSelectedState(
    userSelectionActive: boolean,
    selectedCount: number,
    prevUserSelectionActive: boolean,
    wasAreaSelected: boolean,
) {
    if (userSelectionActive || selectedCount < 2) return false;
    if (prevUserSelectionActive) return true;
    return wasAreaSelected;
}

export function useSelectionResizerArea(
    userSelectionActive: boolean,
    selectedCount: number,
) {
    const prevSelectionActiveRef = useRef(false);
    const [areaSelected, setAreaSelected] = useState(false);

    useEffect(() => {
        const previousSelectionActive = prevSelectionActiveRef.current;
        prevSelectionActiveRef.current = userSelectionActive;

        const nextAreaSelected = getNextAreaSelectedState(
            userSelectionActive,
            selectedCount,
            previousSelectionActive,
            areaSelected,
        );
        if (nextAreaSelected === areaSelected) return;

        let isCancelled = false;
        queueMicrotask(() => {
            if (!isCancelled) {
                setAreaSelected(nextAreaSelected);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [areaSelected, selectedCount, userSelectionActive]);

    return areaSelected;
}
