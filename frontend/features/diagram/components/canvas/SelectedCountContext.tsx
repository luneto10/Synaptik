"use client";

import { createContext, useContext } from "react";

export const SelectedCountContext = createContext(0);

export function useSelectedCount(): number {
    return useContext(SelectedCountContext);
}
