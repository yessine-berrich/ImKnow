import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { ChatService } from '../chat/chat.service';
import { MessageType } from '../chat/entities/chat-message.entity';
import { seedUsers } from './seed-users';

const logger = new Logger('Seed:Chat');

const CHAT_CONVERSATIONS: { pair: [string, string]; messages: { from: string; text: string }[] }[] = [
  {
    pair: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com'],
    messages: [
      { from: 'marie.dupont@imknow.com', text: "Julien, merci pour le commentaire sur le modèle des 4C + ton idée du 5ème C. Tu as des études ou des sources que je pourrais citer dans notre prochain rapport RH ?" },
      { from: 'julien.leroy@imknow.com', text: 'Avec plaisir Marie ! L\'idée vient de Google "Project Aristotle" sur les équipes performantes. Ils ont identifié que la contribution visible rapide est clé pour l\'engagement des nouveaux.' },
      { from: 'marie.dupont@imknow.com', text: "Parfait ! Je vais le référencer. Tu penses qu'on pourrait co-écrire un article sur les bonnes pratiques d'intégration des développeurs spécifiquement ?" },
      { from: 'julien.leroy@imknow.com', text: "Excellente idée ! Un croisement RH + Tech manque vraiment sur la plateforme. Je peux apporter la perspective dev, tu apportes la méthode RH. On vise quand ?" },
      { from: 'marie.dupont@imknow.com', text: "Je suis dispo la semaine prochaine pour un premier cadrage. 1h max pour définir le plan." },
      { from: 'julien.leroy@imknow.com', text: "Noté, je bloque mardi matin. On part sur quoi comme angle ? 'Les 30 premiers jours d'un développeur' ?" },
      { from: 'marie.dupont@imknow.com', text: "J'aimais bien 'Intégration tech : ce que RH et développeurs doivent savoir l'un de l'autre'. Plus collaboratif comme titre." },
      { from: 'julien.leroy@imknow.com', text: "J'adore ! On brise les silos dans l'article même. C'est exactement l'esprit ImKnow. Mardi 9h ?" },
      { from: 'marie.dupont@imknow.com', text: 'Parfait pour moi. Je prépare un brief avec les points qu\'on veut couvrir. À mardi !' },
    ],
  },
  {
    pair: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'emma.moreau@imknow.com', text: "Thomas ! On utilise Claude pour générer nos newsletters internes depuis 2 semaines. 4h économisées par semaine, qualité vraiment bonne. Tu peux me conseiller des prompts pour améliorer encore ?" },
      { from: 'thomas.martin@imknow.com', text: "Super Emma ! Pour les newsletters, la clé c'est le contexte dans le system prompt : ton de voix, audience cible, longueur souhaitée. Et utiliser le prompt caching pour le system prompt fixe — ça réduit les coûts de moitié." },
      { from: 'emma.moreau@imknow.com', text: "Le prompt caching c'est quoi exactement ? Je pensais que c'était juste dans l'API avancée." },
      { from: 'thomas.martin@imknow.com', text: "Anthropic l'a rendu accessible dans l'API standard ! Tu marques certains blocs avec `cache_control: { type: 'ephemeral' }` et le premier call est normal, les suivants coûtent 10x moins." },
      { from: 'emma.moreau@imknow.com', text: "Incroyable, je ne savais pas ! Et pour l'analyse des articles ImKnow, tu as un workflow automatisé pour extraire les insights clés ?" },
      { from: 'thomas.martin@imknow.com', text: "Oui, on a un job hebdomadaire qui récupère les articles les plus lus, les envoie à Claude avec un prompt d'analyse, et génère un résumé des tendances. Je peux te partager le code si tu veux." },
      { from: 'emma.moreau@imknow.com', text: "Ce serait génial ! Et tu penses que je pourrais l'adapter pour analyser les retours de nos clients sur nos campagnes ?" },
      { from: 'thomas.martin@imknow.com', text: "Absolument. Claude est très bon pour l'analyse de sentiment et l'extraction de thèmes. Je t'envoie le code cette semaine avec des commentaires pour l'adapter." },
      { from: 'emma.moreau@imknow.com', text: "Merci Thomas, tu me sauves ! Je vais en faire un article sur ImKnow une fois qu'on aura des résultats." },
      { from: 'thomas.martin@imknow.com', text: "Parfait ! Et tu mettras mon nom en co-auteur ? — mais sérieusement, les articles concrets avec des cas d'usage réels sont les plus utiles sur la plateforme." },
    ],
  },
  {
    pair: ['lea.dubois@imknow.com', 'lucas.bernard@imknow.com'],
    messages: [
      { from: 'lucas.bernard@imknow.com', text: "Léa, j'ai une question urgente. On veut déployer une fonctionnalité de recommandations IA mais ça implique de traiter les préférences de lecture des utilisateurs. On est RGPD compliant ?" },
      { from: 'lea.dubois@imknow.com', text: "Bonne question Lucas ! Les données de comportement de lecture sont des données personnelles. La base légale dépend de votre cas : consentement si c'est optionnel, intérêt légitime si c'est core à votre service." },
      { from: 'lucas.bernard@imknow.com', text: "On pense le proposer opt-in. Qu'est-ce qu'on doit documenter exactement ?" },
      { from: 'lea.dubois@imknow.com', text: "Trois choses : 1) mise à jour du registre des traitements, 2) mention dans la politique de confidentialité (finalité, durée de conservation, tiers impliqués), 3) mécanisme de retrait du consentement accessible." },
      { from: 'lucas.bernard@imknow.com', text: "Pour la durée de conservation des préférences, on peut garder ça aussi longtemps que le compte est actif ?" },
      { from: 'lea.dubois@imknow.com', text: "Oui, avec suppression à la clôture du compte. Et prévoir un export dans le cadre du droit à la portabilité. Le tout doit être dans votre politique de confidentialité." },
      { from: 'lucas.bernard@imknow.com', text: "On a un DPO ? J'ai l'impression qu'on n'en a pas officiellement nommé." },
      { from: 'lea.dubois@imknow.com', text: "Pas encore de DPO nommé formellement. Je joue ce rôle officieusement mais on devrait régulariser ça. Je vais soulever le point en CODIR. En attendant, je te prépare un template de mise à jour de registre." },
      { from: 'lucas.bernard@imknow.com', text: "Merci Léa, tu es indispensable ! Je commence le dev avec un flag feature et on validera la conformité avant le roll-out." },
      { from: 'lea.dubois@imknow.com', text: "Parfait comme approche. Tiens-moi informée quand c'est prêt pour validation finale." },
    ],
  },
  {
    pair: ['camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'],
    messages: [
      { from: 'camille.rousseau@imknow.com', text: "Alexandre, on doit préparer le budget tech pour l'année prochaine. Tu peux m'estimer les coûts infrastructure pour scaler ImKnow à 3x les utilisateurs actuels ?" },
      { from: 'alexandre.petit@imknow.com', text: "Bonjour Camille ! Je travaille dessus avec Lucas. Nos premières estimations : AWS +40% (mise à l'échelle auto K8s), APIs IA +150% (plus de contenu généré), monitoring +20%. Au total environ +60% du budget actuel." },
      { from: 'camille.rousseau@imknow.com', text: "60% c'est significatif. Est-ce qu'il y a des optimisations possibles pour réduire ça ?" },
      { from: 'alexandre.petit@imknow.com', text: "Oui plusieurs : reserved instances AWS (-30% vs on-demand), cache Redis pour réduire les calls DB (-15% RDS), Cloudflare pour le CDN (images servies depuis le edge, -25% bande passante). Ça nous amènerait à +35-40% net." },
      { from: 'camille.rousseau@imknow.com', text: "Ces optimisations, c'est réaliste de les implémenter en combien de temps ?" },
      { from: 'alexandre.petit@imknow.com', text: "Le Cloudflare c'est 1 semaine. Le Redis cache 2-3 semaines. Les reserved instances c'est un achat annuel donc à faire maintenant pour profiter des prix. Je prépare un plan détaillé ?" },
      { from: 'camille.rousseau@imknow.com', text: "Oui, avec les ROI de chaque optimisation. Le board veut voir la rentabilité des investissements tech." },
      { from: 'alexandre.petit@imknow.com', text: "Je vous prépare un document avec : coût initial, économie mensuelle, ROI à 12 mois, et risque de chaque option. Pour la semaine prochaine ?" },
      { from: 'camille.rousseau@imknow.com', text: "Parfait ! Le board se réunit vendredi prochain, j'ai besoin de ça pour jeudi midi au plus tard." },
      { from: 'alexandre.petit@imknow.com', text: "Noté, je priorise ça. Je te tiens au courant si j'ai des questions sur les hypothèses financières." },
    ],
  },
  {
    pair: ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
    messages: [
      { from: 'sophie.laurent@imknow.com', text: "Marie, je travaille sur les maquettes du nouveau profil utilisateur. Pour la section 'compétences' des employés, vous avez une taxonomie officielle RH ou on peut créer des tags libres ?" },
      { from: 'marie.dupont@imknow.com', text: "Bonne question ! On n'a pas de taxonomie officielle actuellement. On utilise les intitulés de poste et les départements. Tu penses à quoi comme système de compétences ?" },
      { from: 'sophie.laurent@imknow.com', text: "Je pensais à un système hybride : tags prédéfinis par département (TypeScript, React pour Développement) + tags libres pour les compétences transverses (Management, Formation, RGPD...). Validé par le manager." },
      { from: 'marie.dupont@imknow.com', text: "J'aime beaucoup l'idée ! La validation par le manager est clé pour éviter les auto-déclarations de compétences non vérifiées. On pourrait aussi avoir des niveaux : débutant / intermédiaire / expert." },
      { from: 'sophie.laurent@imknow.com', text: "Exactement ! Et pour l'affichage sur le profil public, on ne montrerait que les compétences validées. Ça crédibilise vraiment les profils." },
      { from: 'marie.dupont@imknow.com', text: "Pour le RH, ça nous donnerait aussi une cartographie des compétences de l'entreprise en temps réel — super utile pour les plans de formation et la mobilité interne." },
      { from: 'sophie.laurent@imknow.com', text: "Parfaitement aligné avec ce qu'on peut faire côté produit. Je vais prototyper ça dans Figma cette semaine. Tu peux me faire valider par quelques managers pour le concept ?" },
      { from: 'marie.dupont@imknow.com', text: "Je vous organise un test utilisateur rapide avec 3 managers jeudi ? 30 minutes chacun, on teste les maquettes." },
      { from: 'sophie.laurent@imknow.com', text: "Idéal ! Je prépare un prototype cliquable Figma d'ici mercredi soir. Je vous envoie le lien." },
      { from: 'marie.dupont@imknow.com', text: "Super ! Et si ça passe le test, on le propose en priorité pour le prochain sprint ?" },
      { from: 'sophie.laurent@imknow.com', text: "Absolument. Je suis très enthousiaste sur ce projet — c'est exactement le genre de feature qui différencie ImKnow des plateformes génériques." },
    ],
  },
  {
    pair: ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'emma.moreau@imknow.com', text: "Julien, je dois pitcher ImKnow à notre nouveau DG la semaine prochaine. Tu peux m'aider à traduire les bénéfices techniques en valeur business ?" },
      { from: 'julien.leroy@imknow.com', text: "Avec plaisir Emma ! Les DG sont sensibles au ROI et à la réduction de risque. Pour ImKnow : temps de recherche d'info -40%, onboarding des nouveaux -3 semaines, duplication de travail identifiable." },
      { from: 'emma.moreau@imknow.com', text: "Tu as des chiffres mesurés ou ce sont des estimations ?" },
      { from: 'julien.leroy@imknow.com', text: "Estimations basées sur des études sectorielles (McKinsey 2023 sur les knowledge workers). Mais on peut mesurer nos propres KPIs si on définit un baseline avant et après l'adoption." },
      { from: 'emma.moreau@imknow.com', text: "Bonne idée ! On pourrait faire une enquête auprès des employés avant le pitch pour avoir nos propres données." },
      { from: 'julien.leroy@imknow.com', text: "3 questions max : temps moyen par semaine à chercher de l'information, % de fois où ils ne trouvent pas ce qu'ils cherchent, frustration liée à la connaissance non documentée (1-10)." },
      { from: 'emma.moreau@imknow.com', text: "Je lance ça demain sur Teams. On aura les résultats avant vendredi. Pour le pitch lui-même, tu aurais une démo live ou des screenshots ?" },
      { from: 'julien.leroy@imknow.com', text: "Je te prépare un compte demo avec des données réalistes. Une démo live est toujours plus convaincante qu'un PowerPoint." },
      { from: 'emma.moreau@imknow.com', text: "Parfait ! Et si le DG pose des questions techniques auxquelles je ne sais pas répondre, tu serais disponible pour rejoindre le call ?" },
      { from: 'julien.leroy@imknow.com', text: "Bien sûr, bloque-moi sur le calendrier. Je préfère être là pour garantir des réponses précises sur l'architecture et la sécurité." },
    ],
  },
  {
    pair: ['nicolas.mercier@imknow.com', 'thomas.martin@imknow.com'],
    messages: [
      { from: 'nicolas.mercier@imknow.com', text: "Thomas, bien vu ton article sur les patterns JS ! Tu connais le pattern Signal proposé par SolidJS ? Je pense que ça va devenir le standard dans les frameworks." },
      { from: 'thomas.martin@imknow.com', text: "Oui, j'ai suivi la conf de Ryan Carniato ! Les signaux avec leur push-pull sont fascinants. Tu as testé Preact Signals ou Angular Signals ?" },
      { from: 'nicolas.mercier@imknow.com', text: "J'ai testé Preact Signals dans un side project. La DX est incroyable — plus besoin de dépendances de gestion d'état. Par contre les refs dans React manquent un peu." },
      { from: 'thomas.martin@imknow.com', text: "Je pense qu'on va voir React adopter un système de signaux dans les prochaines versions ou via une lib externe. Le TC39 travaille sur des propositions." },
    ],
  },
  {
    pair: ['clarisse.renaud@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'clarisse.renaud@imknow.com', text: "Emma, j'ai commencé à rédiger mon article sur les tests A/B. Tu peux relire la partie sur le peeking problem quand tu as un moment ?" },
      { from: 'emma.moreau@imknow.com', text: "Bien sûr ! Envoie-moi le lien. J'ajouterais aussi une section sur la segmentation des audiences — c'est un piège dans lequel on est tombés avec la campagne LinkedIn." },
      { from: 'clarisse.renaud@imknow.com', text: "Excellent conseil ! J'ajoute ça. Et pour les dates de publication, tu penses qu'on peut le programmer pour la semaine prochaine ?" },
      { from: 'emma.moreau@imknow.com', text: "Oui, on vise jeudi. Je vais le promouvoir sur notre newsletter interne et LinkedIn." },
    ],
  },
];

export async function seedChat(
  context?: INestApplicationContext,
  emailToUser?: Record<string, User>,
): Promise<void> {
  const ownContext = !context;
  if (!context) {
    context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  }

  if (!emailToUser) {
    const result = await seedUsers(context);
    emailToUser = result.emailToUser;
  }

  const chatService = context.get(ChatService);

  try {
    let msgCount = 0;
    for (const conv of CHAT_CONVERSATIONS) {
      const [email1, email2] = conv.pair;
      const user1 = emailToUser[email1];
      const user2 = emailToUser[email2];
      if (!user1 || !user2) continue;

      for (const msg of conv.messages) {
        const senderEmail = msg.from;
        const sender = emailToUser[senderEmail];
        const receiver = senderEmail === email1 ? user2 : user1;
        if (!sender || !receiver) continue;

        try {
          await chatService.sendMessage(sender.id, receiver.id, {
            content: msg.text,
            type: MessageType.TEXT,
          });
          msgCount++;
        } catch (err: any) {
          logger.warn(`  ⚠️ Chat ${msg.from}: ${err.message}`);
        }
      }
    }
    logger.log(`  ✅ ${msgCount} messages`);
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedChat().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
