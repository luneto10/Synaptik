import axios from "axios";
import type { TableNode, RelationEdge } from "../types/flow.types";

export interface DiagramPayload {
    nodes: TableNode[];
    edges: RelationEdge[];
}

export interface SaveDiagramResponse {
    id: string;
}

export const diagramApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
    headers: { "Content-Type": "application/json" },
});

export async function saveDiagram(
    payload: DiagramPayload,
): Promise<SaveDiagramResponse> {
    console.log("Payload →", JSON.stringify(payload, null, 2));
    const { data } = await diagramApi.post<SaveDiagramResponse>(
        "/diagram",
        payload,
    );
    return data;
}

export async function loadDiagramById(id: string): Promise<DiagramPayload> {
    const { data } = await diagramApi.get<DiagramPayload>(`/diagram/${id}`);
    return data;
}
