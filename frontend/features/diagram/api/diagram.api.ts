import axios from "axios";
import { DbTable } from "../types/db.types";
import { RelationEdge } from "../types/flow.types";

export interface SaveDiagramRequest {
    tables: DbTable[];
    edges: RelationEdge[];
}

export interface SaveDiagramResponse {
    sql: string;
}

export const diagramApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
    headers: { "Content-Type": "application/json" },
});

export async function saveDiagram(
    request: SaveDiagramRequest,
): Promise<SaveDiagramResponse> {
    const { data } = await diagramApi.post<SaveDiagramResponse>(
        "/diagram",
        request,
    );
    return data;
}
