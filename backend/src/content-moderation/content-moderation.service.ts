import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export interface MediaModerationInput {
  filename: string;
  mimetype: string;
  type: string; // 'image' | 'video' | 'audio' | 'document' | 'other'
}

interface SingleMediaResult {
  filename: string;
  type: string;
  isFlagged: boolean;
  score: number;
  reason?: string;
  categories?: string[];
}

// Nombre maximal de caractères extraits d'un document envoyés à Groq
const MAX_DOC_TEXT_LENGTH = 3_000;

@Injectable()
export class ContentModerationService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  private readonly groqModels = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
  ];

  private readonly ollamaHost = 'http://localhost:11434';
  private readonly visionModels = ['llava', 'moondream', 'llava:13b'];

  // ── Point d'entrée principal ───────────────────────────────────────────────

  async moderate(
    title: string,
    content: string,
    media?: MediaModerationInput[],
  ): Promise<any> {
    const mediaList = media ?? [];
    const mediaResults: SingleMediaResult[] = [];

    // ── 1a. Modération visuelle des images (Ollama, best-effort) ──────────────
    const images = mediaList.filter((m) => m.type === 'image');
    for (const img of images) {
      try {
        const result = await this.moderateImage(img.filename);
        mediaResults.push({ filename: img.filename, type: img.type, ...result });
      } catch (err: any) {
        console.warn(`[MODERATION IMAGE] Ignoré pour "${img.filename}" :`, err.message);
      }
    }

    // ── 1b. Extraction + modération du contenu des documents ──────────────────
    const docs = mediaList.filter((m) => this.isExtractableDocument(m.mimetype));
    for (const doc of docs) {
      try {
        const text = await this.extractDocumentText(doc.filename, doc.mimetype);
        if (text && text.length >= 50) {
          const result = await this.moderateDocumentText(doc.filename, text);
          mediaResults.push({ filename: doc.filename, type: doc.type, ...result });
        } else {
          console.info(
            `[MODERATION DOC] "${doc.filename}" : texte extrait insuffisant (${text?.length ?? 0} chars)`,
          );
        }
      } catch (err: any) {
        console.warn(`[MODERATION DOC] Ignoré pour "${doc.filename}" :`, err.message);
      }
    }

    // ── 2. Modération texte via Groq (titre + contenu + métadonnées media) ────
    const mediaContext = this.buildMediaContext(mediaList);
    const textResult = await this.moderateText(title, content, mediaContext);

    // ── 3. Score final = pire des scores ──────────────────────────────────────
    const allScores = [textResult.score, ...mediaResults.map((r) => r.score)];
    const finalScore = Math.max(...allScores);

    const uniqueCategories = [
      ...new Set([
        ...textResult.categories,
        ...mediaResults.flatMap((r) => r.categories ?? []),
      ]),
    ];

    const worstMedia = mediaResults
      .filter((r) => r.score > textResult.score)
      .sort((a, b) => b.score - a.score)[0];

    const result: any = {
      isFlagged: textResult.isFlagged || mediaResults.some((r) => r.isFlagged) || finalScore > 0.35,
      score: finalScore,
      categories: uniqueCategories,
      reason: worstMedia?.reason ?? textResult.reason,
      confidence: textResult.confidence,
      model: textResult.model,
      moderatedAt: new Date(),
    };

    if (mediaResults.length > 0) {
      result.mediaResults = mediaResults;
    }

    console.log(
      `[MODERATION] Score final: ${finalScore} | Flagged: ${result.isFlagged}` +
      ` | Catégories: ${uniqueCategories.join(', ') || 'aucune'}`,
    );

    return result;
  }

  // ── Helpers privés ─────────────────────────────────────────────────────────

  /** Retourne true si le mimetype correspond à un document dont on peut extraire le texte. */
  private isExtractableDocument(mimetype: string): boolean {
    return (
      mimetype === 'application/pdf' ||
      mimetype === 'text/plain' ||
      mimetype.includes('word') ||
      mimetype.includes('document') ||
      mimetype.includes('excel') ||
      mimetype.includes('spreadsheet') ||
      mimetype.includes('presentation') ||
      mimetype.includes('opendocument')
    );
  }

  /**
   * Extrait le texte brut d'un fichier document.
   * - PDF       → pdf-parse
   * - Texte     → lecture directe UTF-8
   * - Office / LibreOffice → officeparser
   * Retourne null si l'extraction échoue ou si le fichier est introuvable.
   */
  private async extractDocumentText(
    filename: string,
    mimetype: string,
  ): Promise<string | null> {
    const filePath = path.join(process.cwd(), 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[MODERATION DOC] Fichier introuvable : ${filePath}`);
      return null;
    }

    try {
      // ── Texte brut ─────────────────────────────────────────────────────────
      if (mimetype === 'text/plain') {
        return fs.readFileSync(filePath, 'utf-8').trim() || null;
      }

      // ── PDF ────────────────────────────────────────────────────────────────
      if (mimetype === 'application/pdf') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse');
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        const text: string = data.text ?? '';
        console.info(`[MODERATION DOC] PDF "${filename}" → ${text.length} chars extraits`);
        return text.trim() || null;
      }

      // ── Word / Excel / PowerPoint / LibreOffice ────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { parseOfficeAsync } = require('officeparser');
      const text: string = await parseOfficeAsync(filePath);
      console.info(`[MODERATION DOC] Office "${filename}" → ${text.length} chars extraits`);
      return text.trim() || null;
    } catch (err: any) {
      console.warn(`[MODERATION DOC] Extraction échouée pour "${filename}" :`, err.message);
      return null;
    }
  }

  /**
   * Modère le texte extrait d'un document via Groq.
   * Le texte est tronqué à MAX_DOC_TEXT_LENGTH pour limiter les tokens.
   */
  private async moderateDocumentText(
    filename: string,
    text: string,
  ): Promise<{ isFlagged: boolean; score: number; reason: string; categories: string[] }> {
    const truncated = text.length > MAX_DOC_TEXT_LENGTH
      ? text.slice(0, MAX_DOC_TEXT_LENGTH) + '…'
      : text;

    const result = await this.moderateText(
      `Contenu du fichier : ${filename}`,
      truncated,
      '',
    );

    console.log(
      `[MODERATION DOC] "${filename}" | Score: ${result.score}` +
      ` | Flagged: ${result.isFlagged}` +
      ` | Catégories: ${result.categories?.join(', ') || 'aucune'}`,
    );

    return {
      isFlagged: result.isFlagged,
      score: result.score,
      reason: result.reason ?? '',
      categories: result.categories ?? [],
    };
  }

  /** Construit le bloc de contexte média injecté dans le prompt texte. */
  private buildMediaContext(media: MediaModerationInput[]): string {
    if (!media.length) return '';

    const grouped = media.reduce<Record<string, string[]>>((acc, m) => {
      (acc[m.type] ??= []).push(`${m.filename} (${m.mimetype})`);
      return acc;
    }, {});

    const lines = Object.entries(grouped).map(
      ([type, files]) => `  - ${type} : ${files.join(', ')}`,
    );

    return `\n\nFichiers joints :\n${lines.join('\n')}`;
  }

  /** Modération texte via Groq avec fallback de modèles. */
  private async moderateText(
    title: string,
    content: string,
    mediaContext: string,
  ): Promise<any> {
    let lastError: any;

    for (const model of this.groqModels) {
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
- spam ou arnaque
- noms de fichiers évocateurs de contenu illégal (ex: crack, keygen, xxx, torrent)`,
            },
            {
              role: 'user',
              content: `Titre: ${title}\n\nContenu:\n${content}${mediaContext}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) throw new Error('Réponse vide');

        const parsed = JSON.parse(raw);

        if (
          typeof parsed.isFlagged !== 'boolean' ||
          typeof parsed.score !== 'number' ||
          !Array.isArray(parsed.categories)
        ) {
          throw new Error(`JSON invalide : ${JSON.stringify(parsed)}`);
        }

        parsed.model = model;
        console.log(
          `[MODERATION TEXTE] Modèle: ${model} | Score: ${parsed.score}` +
          ` | Flagged: ${parsed.isFlagged} | Catégories: ${parsed.categories}`,
        );

        return parsed;
      } catch (err: any) {
        console.warn(`[MODERATION TEXTE] Échec avec ${model} :`, err.message);
        lastError = err;
      }
    }

    throw lastError;
  }

  /** Modération visuelle d'une image via Ollama (llava / moondream). */
  private async moderateImage(filename: string): Promise<{
    isFlagged: boolean;
    score: number;
    reason: string;
    categories: string[];
  }> {
    const imagePath = path.join(process.cwd(), 'uploads', filename);

    if (!fs.existsSync(imagePath)) {
      console.warn(`[MODERATION IMAGE] Fichier introuvable : ${imagePath}`);
      return { isFlagged: false, score: 0, reason: 'Fichier introuvable', categories: [] };
    }

    const base64 = fs.readFileSync(imagePath).toString('base64');

    const prompt =
      'Analyse cette image pour la modération de contenu. ' +
      'Réponds UNIQUEMENT avec du JSON valide (sans markdown) :\n' +
      '{"isFlagged":boolean,"score":0.0-1.0,"reason":"string en français","categories":["nudity","violence","hate_symbols","graphic_content","spam"]}\n' +
      'Score : 0.0-0.2=approprié, 0.2-0.35=limite, 0.35-0.7=problématique, 0.7-1.0=grave (nudité explicite, violence graphique…)';

    for (const visionModel of this.visionModels) {
      try {
        const response = await axios.post(
          `${this.ollamaHost}/api/chat`,
          {
            model: visionModel,
            messages: [{ role: 'user', content: prompt, images: [base64] }],
            stream: false,
            options: { temperature: 0.1 },
          },
          { timeout: 30_000 },
        );

        const raw: string = response.data?.message?.content ?? '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Pas de JSON dans la réponse');

        const parsed = JSON.parse(jsonMatch[0]);

        if (typeof parsed.isFlagged !== 'boolean' || typeof parsed.score !== 'number') {
          throw new Error(`JSON invalide : ${raw}`);
        }

        console.log(
          `[MODERATION IMAGE] "${filename}" | Modèle: ${visionModel} | Score: ${parsed.score}`,
        );

        return {
          isFlagged: parsed.isFlagged,
          score: Number(parsed.score),
          reason: parsed.reason ?? '',
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        };
      } catch (err: any) {
        const isUnavailable =
          err.code === 'ECONNREFUSED' ||
          err.response?.status === 404 ||
          err.message?.includes('model') ||
          err.message?.includes('not found');

        if (isUnavailable) {
          console.warn(
            `[MODERATION IMAGE] Modèle ${visionModel} indisponible, essai suivant…`,
          );
          continue;
        }

        throw err;
      }
    }

    console.warn(
      `[MODERATION IMAGE] Aucun modèle vision disponible pour "${filename}", ignoré`,
    );
    return { isFlagged: false, score: 0, reason: 'Modération vision indisponible', categories: [] };
  }
}
