export interface RagResponse {
  success: boolean;
  query: string;
  found: number;
  retrieved_articles?: Array<{
    id: number;
    title: string;
    similarity: number;
  }>;
  answer?: string;
  error?: string;
}