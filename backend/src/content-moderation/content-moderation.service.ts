// content-moderation.service.ts
import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class ContentModerationService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  private models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',   // fallback rapide
    'gemma2-9b-it',            // fallback alternatif
  ];

  async moderate(title: string, content: string): Promise<any> {
    let lastError: any;

    for (const model of this.models) {
      try {
        const response = await this.groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `Tu es un modérateur de contenu strict.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication.
Format EXACT :
{
  "isFlagged": boolean,
  "score": number entre 0.0 et 1.0,
  "categories": array parmi ["toxicity","severe_toxicity","obscene","threat","insult","identity_hate","sexual_content","violence","spam","hate_speech","harassment","piracy"],
  "reason": "explication courte en français",
  "confidence": number entre 0.0 et 1.0
}
Règles de scoring :
- 0.0 à 0.2 : contenu sain
- 0.2 à 0.35 : contenu limite, surveiller
- 0.35 à 0.7 : contenu problématique → PENDING
- 0.7 à 1.0 : contenu grave → REJECTED
Exemples de contenu grave (score > 0.7) :
- contenu sexuel explicite
- piratage logiciel, cracks, torrents
- discours de haine, violence explicite
- spam ou arnaque`,
            },
            {
              role: 'user',
              content: `Titre: ${title}\n\nContenu:\n${content}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) throw new Error('Réponse vide');

        const parsed = JSON.parse(raw);

        // Validation des champs obligatoires
        if (
          typeof parsed.isFlagged !== 'boolean' ||
          typeof parsed.score !== 'number' ||
          !Array.isArray(parsed.categories)
        ) {
          throw new Error(`JSON invalide : ${JSON.stringify(parsed)}`);
        }

        parsed.model = model;
        parsed.moderatedAt = new Date();

        console.log(`[MODERATION] Modèle: ${model} | Score: ${parsed.score} | Flagged: ${parsed.isFlagged} | Categories: ${parsed.categories}`);

        return parsed;

      } catch (err) {
        console.warn(`[MODERATION] Échec avec ${model} :`, err.message);
        lastError = err;
        continue; // essaie le modèle suivant
      }
    }

    // Tous les modèles ont échoué
    throw lastError;
  }
}