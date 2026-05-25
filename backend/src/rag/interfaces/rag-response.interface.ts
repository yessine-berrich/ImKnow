export interface RagSource {
  publicationId: number;
  title: string;
  chunkIndex: number;
  similarity: number;
}

export interface RagResponse {
  success: boolean;
  query: string;
  found: number;
  answer?: string;
  sources?: RagSource[];
  error?: string;
  conversationId?: number;
}
