import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { PublicationReport } from 'src/publication/entities/publication-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';

export type AiRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AiRecommendedAction = 'dismiss' | 'review' | 'warn' | 'hide' | 'ban';

export interface AiAnalysisResult {
  riskScore:           number;
  riskLevel:           AiRiskLevel;
  categories:          string[];
  summary:             string;
  recommendedAction:   AiRecommendedAction;
  confidence:          number;
  model:               string;
}

@Injectable()
export class ReportAIService {
  private readonly logger = new Logger(ReportAIService.name);
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  private readonly models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-8b-8192',
  ];

  constructor(
    @InjectRepository(PublicationReport)
    private readonly pubReportRepo: Repository<PublicationReport>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  async analyzePublicationReport(reportId: number): Promise<void> {
    const report = await this.pubReportRepo.findOne({
      where: { id: reportId },
      relations: ['publication', 'publication.author', 'reporter'],
    });
    if (!report) {
      this.logger.warn(`[ReportAI] PublicationReport ${reportId} introuvable`);
      return;
    }

    const allReports = await this.pubReportRepo.find({
      where: { publication: { id: report.publication?.id } },
      relations: ['reporter'],
    });

    const context = this.buildPublicationContext(report, allReports);
    const result  = await this.callGroq(context, 'publication');

    await this.pubReportRepo.update(reportId, {
      aiRiskScore:          result.riskScore,
      aiRiskLevel:          result.riskLevel,
      aiCategories:         result.categories,
      aiSummary:            result.summary,
      aiRecommendedAction:  result.recommendedAction,
      aiConfidence:         result.confidence,
      aiModel:              result.model,
      aiAnalyzedAt:         new Date(),
    });

    this.logger.log(
      `[ReportAI] Publication report ${reportId} analysé — niveau: ${result.riskLevel} | score: ${result.riskScore}`,
    );
  }

  async analyzeUserReport(reportId: number): Promise<void> {
    const report = await this.userReportRepo.findOne({
      where: { id: reportId },
      relations: ['reportedUser', 'reporter'],
    });
    if (!report) {
      this.logger.warn(`[ReportAI] UserReport ${reportId} introuvable`);
      return;
    }

    const allReports = await this.userReportRepo.find({
      where: { reportedUser: { id: report.reportedUser?.id } },
      relations: ['reporter'],
    });

    const context = this.buildUserContext(report, allReports);
    const result  = await this.callGroq(context, 'user');

    await this.userReportRepo.update(reportId, {
      aiRiskScore:          result.riskScore,
      aiRiskLevel:          result.riskLevel,
      aiCategories:         result.categories,
      aiSummary:            result.summary,
      aiRecommendedAction:  result.recommendedAction,
      aiConfidence:         result.confidence,
      aiModel:              result.model,
      aiAnalyzedAt:         new Date(),
    });

    this.logger.log(
      `[ReportAI] User report ${reportId} analysé — niveau: ${result.riskLevel} | score: ${result.riskScore}`,
    );
  }

  // ── Context builders ────────────────────────────────────────────────────────

  private buildPublicationContext(
    report: PublicationReport,
    allReports: PublicationReport[],
  ): string {
    const pub = report.publication as any;
    const uniqueReporters = new Set(allReports.map((r) => r.reporter?.id)).size;
    const reasons = [...new Set(allReports.map((r) => r.reason))];

    return `
Type: signalement de publication
Raison du signalement: ${report.reason}
Détails: ${report.details ?? 'aucun'}

Publication:
- Titre: ${pub?.title ?? 'inconnu'}
- Contenu (extrait): ${(pub?.content ?? '').slice(0, 500)}
- Statut: ${pub?.status ?? 'inconnu'}
- Auteur: ${pub?.author ? `${pub.author.firstName} ${pub.author.lastName}`.trim() : 'inconnu'}

Historique des signalements:
- Nombre total de signalements: ${allReports.length}
- Reporters uniques: ${uniqueReporters}
- Raisons signalées: ${reasons.join(', ')}
`.trim();
  }

  private buildUserContext(
    report: UserReport,
    allReports: UserReport[],
  ): string {
    const user = report.reportedUser as any;
    const uniqueReporters = new Set(allReports.map((r) => r.reporter?.id)).size;
    const reasons = [...new Set(allReports.map((r) => r.reason))];

    return `
Type: signalement d'utilisateur
Raison du signalement: ${report.reason}
Détails: ${report.details ?? 'aucun'}

Profil signalé:
- Nom: ${user ? `${user.firstName} ${user.lastName}`.trim() : 'inconnu'}
- Email: ${user?.email ?? 'inconnu'}
- Département: ${user?.department ?? 'inconnu'}
- Statut du compte: ${user?.status ?? 'inconnu'}
- Rôle: ${user?.role ?? 'inconnu'}

Historique des signalements:
- Nombre total de signalements: ${allReports.length}
- Reporters uniques: ${uniqueReporters}
- Raisons signalées: ${reasons.join(', ')}
`.trim();
  }

  // ── Groq call with model fallback ───────────────────────────────────────────

  private async callGroq(
    context: string,
    type: 'publication' | 'user',
  ): Promise<AiAnalysisResult> {
    const systemPrompt = `Tu es un assistant de modération de contenu pour une plateforme professionnelle.
Analyse le signalement suivant et retourne UNIQUEMENT un JSON valide, sans markdown, sans explication.

Format EXACT :
{
  "riskScore": number entre 0.0 et 1.0,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "categories": array de strings parmi ["spam","harassment","hate_speech","inappropriate_content","misinformation","plagiarism","impersonation","violence","sexual_content","other"],
  "summary": "résumé court en français (max 120 caractères)",
  "recommendedAction": "dismiss" | "review" | "warn" | "hide" | "ban",
  "confidence": number entre 0.0 et 1.0
}

Règles de niveau de risque :
- "low" (0.0-0.3) : signalement probablement sans fondement sérieux
- "medium" (0.3-0.6) : revue humaine conseillée
- "high" (0.6-0.8) : action recommandée rapidement
- "critical" (0.8-1.0) : contenu ou comportement grave, urgence absolue

Règles d'action recommandée :
- "dismiss" : signalement non fondé
- "review" : nécessite examen humain
- "warn" : avertissement à l'auteur/utilisateur
- "hide" : masquer le contenu ${type === 'publication' ? 'de la publication' : 'du profil'}
- "ban" : suspension du compte (réserver aux cas les plus graves)

IMPORTANT : Tu ne prends jamais de décision finale. Tu aides uniquement l'admin à prioriser.`;

    let lastError: unknown;

    for (const model of this.models) {
      try {
        const response = await this.groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
          ],
          temperature: 0.1,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) throw new Error('Réponse vide');

        const parsed = JSON.parse(raw) as Partial<AiAnalysisResult>;
        this.validateResult(parsed);

        return { ...(parsed as AiAnalysisResult), model };
      } catch (err) {
        this.logger.warn(`[ReportAI] Échec avec ${model}: ${(err as Error).message}`);
        lastError = err;
      }
    }

    throw lastError;
  }

  private validateResult(parsed: Partial<AiAnalysisResult>): void {
    if (typeof parsed.riskScore !== 'number') throw new Error('riskScore manquant');
    if (!['low', 'medium', 'high', 'critical'].includes(parsed.riskLevel as string)) {
      throw new Error('riskLevel invalide');
    }
    if (!Array.isArray(parsed.categories)) throw new Error('categories manquant');
    if (typeof parsed.summary !== 'string') throw new Error('summary manquant');
    if (!['dismiss', 'review', 'warn', 'hide', 'ban'].includes(parsed.recommendedAction as string)) {
      throw new Error('recommendedAction invalide');
    }
    if (typeof parsed.confidence !== 'number') throw new Error('confidence manquant');
  }
}
