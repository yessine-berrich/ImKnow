import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ChunkSearchResult } from './rag-retrieval.service';

@Injectable()
export class GroqRagService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  private model = 'llama-3.3-70b-versatile';

  async generateRAGResponse(
    question: string,
    chunks: ChunkSearchResult[],
  ): Promise<string> {
    const contextText = chunks
      .map(
        (c, i) =>
          `[Article ${i + 1}] "${c.title}" — extrait ${c.chunkIndex + 1} (pertinence ${c.similarity.toFixed(3)})\n${c.content}`,
      )
      .join('\n────────────────────\n');

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant expert en intelligence artificielle, spécialisé dans la synthèse d'articles techniques.

Règles absolues :
1. Réponds UNIQUEMENT à partir des extraits fournis dans le contexte. N'utilise jamais tes connaissances générales.
2. Si la réponse n'est pas dans le contexte, dis clairement : "Je ne trouve pas cette information dans les documents disponibles."
3. Cite obligatoirement tes sources avec la notation [Article 1], [Article 2], etc., correspondant aux numéros du contexte.
4. Réponds toujours en français, avec un ton professionnel et concis.
5. Ne répète pas les extraits mot pour mot ; synthétise et structure la réponse.
6. N'invente aucune information. En cas de doute, choisis la transparence.`,
          },
          {
            role: 'user',
            content: `Question : ${question}

Contexte extrait des articles :
${contextText}

Réponds en citant les sources [Article N] :`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      });

      return (
        response.choices[0]?.message?.content?.trim() ||
        'Aucune réponse générée.'
      );
    } catch (err: any) {
      console.error('[GROQ RAG] Erreur :', err.message);
      return 'Désolé, une erreur est survenue avec Groq.';
    }
  }
}
