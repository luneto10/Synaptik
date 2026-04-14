"use client";

import dynamic from "next/dynamic";

const FlowCanvas = dynamic(() => import("@/features/diagram/FlowCanvas"), {
    ssr: false,
});

export default function DiagramClient() {
    return <FlowCanvas />;
}
