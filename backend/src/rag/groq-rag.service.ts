import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class GroqRagService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  private model = 'llama-3.3-70b-versatile';

  async generateRAGResponse(
    question: string,
    contextChunks: { title: string; content_preview: string; similarity: number }[],
  ): Promise<string> {
    const contextText = contextChunks
      .map((c, i) => `[Article ${i + 1}] (${c.title} – pertinence ${c.similarity.toFixed(3)})\n${c.content_preview}`)
      .join('\n────────────────────\n');

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant expert en intelligence artificielle, spécialisé dans l'analyse et la synthèse d'articles techniques et scientifiques.

📌 **Règles strictes à suivre :**
1. **Base-toi UNIQUEMENT sur le contexte fourni** - N'utilise pas tes connaissances personnelles si l'information n'est pas dans le contexte
2. **Si l'information n'est pas disponible** - Réponds clairement : "Je ne trouve pas d'information sur ce sujet dans les documents fournis."
3. **Cite tes sources** - Référence les articles pertinents (ex: "Selon l'article 1...", "L'article 3 mentionne...")
4. **Sois précis et concis** - Va droit au but sans ajouter de contenu superflu
5. **Structure ta réponse** - Utilise des paragraphes courts et une hiérarchie claire (listes, titres si pertinent)
6. **Langue française** - Réponds toujours en français, avec un ton professionnel mais accessible
7. **Pertinence avant tout** - Si plusieurs articles parlent du même sujet, synthétise sans répétition inutile

✅ **Ce que tu dois faire :**
- Extraire les informations clés du contexte
- Faire des liens entre les différents articles
- Proposer des exemples concrets quand disponibles dans le contexte
- Indiquer le niveau de certitude de l'information (ex: "l'article suggère que...", "il est clairement indiqué que...")

❌ **Ce que tu ne dois PAS faire :**
- Inventer des informations ou "halluciner"
- Donner ton avis personnel
- Ignorer des informations pertinentes du contexte
- Utiliser des termes trop techniques sans explication
- Dépasser les limites du contexte fourni

🔍 **Spécificités pour les questions techniques :**
- Privilégie les définitions et explications présentes dans les articles
- Pour les comparaisons (ex: "différence entre X et Y"), base-toi uniquement sur ce que disent les articles
- Pour les questions d'implémentation, ne fournis que le code présent dans le contexte

Rappel : Ta crédibilité dépend de ta fidélité au contexte. En cas de doute, privilégie l'honnêteté plutôt qu'une réponse approximative.`,
          },
          {
            role: 'user',
            content: `Question : ${question}

Contexte extrait des articles :
${contextText}

Réponds en te basant sur le contexte fourni :`,
          },
        ],
        temperature: 0.65,
        max_tokens: 1800,
      });

      return response.choices[0]?.message?.content?.trim() || "Aucune réponse générée.";
    } catch (err) {
      console.error('[GROQ RAG] Erreur :', err.message);
      return "Désolé, une erreur est survenue avec Groq.";
    }
  }
}