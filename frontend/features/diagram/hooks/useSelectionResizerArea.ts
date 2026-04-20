import { useEffect, useRef, useState } from "react";

function getNextAreaSelectedState(
    userSelectionActive: boolean,
    nodesSelectionActive: boolean,
    selectedCount: number,
    prevUserSelectionActive: boolean,
    wasAreaSelected: boolean,
) {
    if (userSelectionActive || selectedCount < 2) return false;
    if (nodesSelectionActive) return true;
    if (prevUserSelectionActive) return true;
    return wasAreaSelected;
}

export function useSelectionResizerArea(
    userSelectionActive: boolean,
    nodesSelectionActive: boolean,
    selectedCount: number,
) {
    const prevSelectionActiveRef = useRef(false);
    const [areaSelected, setAreaSelected] = useState(false);

    useEffect(() => {
        const previousSelectionActive = prevSelectionActiveRef.current;
        prevSelectionActiveRef.current = userSelectionActive;

        const nextAreaSelected = getNextAreaSelectedState(
            userSelectionActive,
            nodesSelectionActive,
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
    }, [areaSelected, nodesSelectionActive, selectedCount, userSelectionActive]);

    return areaSelected;
}
