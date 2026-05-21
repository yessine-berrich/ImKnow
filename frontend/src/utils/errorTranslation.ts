// utils/errorTranslation.ts
//
// Maps every known backend error message to an i18n translation key.
// Dynamic messages (e.g. "X tentative(s) restante(s)") are matched with
// regex so the embedded number is preserved in the translation.
//
// Usage inside a React component:
//   import { translateError } from '@/utils/errorTranslation';
//   <span>{translateError(error, t)}</span>
//
// Fallback: if no pattern matches, the raw message is returned unchanged.

type TFunction = (key: string, params?: Record<string, unknown>) => string;

export function translateError(
  message: string | null | undefined,
  t: TFunction,
): string {
  if (!message) return t('errors.generic');

  const raw = message.trim();
  const msg = raw.toLowerCase();

  // ─── Dynamic messages (regex — must come FIRST) ───────────────────────────

  // "Compte temporairement bloqué. Réessayez dans X minute(s)."
  const lockMinMatch =
    msg.match(/réessayez dans (\d+) minute/i) ||
    msg.match(/try again in (\d+) minute/i);
  if (lockMinMatch)
    return t('errors.account_locked_minutes', { count: parseInt(lockMinMatch[1]) });

  // "Email ou mot de passe incorrect. X tentative(s) restante(s)."
  const attemptsMatch =
    msg.match(/(\d+) tentative/) ||
    msg.match(/(\d+) attempt.*remain/i) ||
    msg.match(/(\d+) essai/i);
  if (attemptsMatch)
    return t('errors.attempts_remaining', { count: parseInt(attemptsMatch[1]) });

  // "Compte bloqué pendant X minutes."
  const blockedDurationMatch = msg.match(/bloqué pendant (\d+) minute/i);
  if (blockedDurationMatch)
    return t('errors.account_locked_minutes', { count: parseInt(blockedDurationMatch[1]) });

  // "Publication #X not found" / "Utilisateur avec l'ID X non trouvé"
  if (/publication #?\d+ (not found|introuvable)/i.test(msg) || /publication #?\d+/.test(msg))
    return t('errors.publication_not_found');
  if (/utilisateur (avec l'id|#)?\d+ non trouvé/i.test(msg))
    return t('errors.user_not_found');
  if (/user #?\d+ not found/i.test(msg))
    return t('errors.user_not_found');
  if (/category with id \d+ not found/i.test(msg))
    return t('errors.category_not_found');
  if (/tag with id \d+ not found/i.test(msg))
    return t('errors.tag_not_found');

  // "La catégorie \"X\" existe déjà" / "Le tag \"X\" existe déjà"
  if (msg.includes('catégorie') && (msg.includes('existe déjà') || msg.includes('already exists')))
    return t('errors.category_exists');
  if (msg.includes('tag') && (msg.includes('existe déjà') || msg.includes('already exists')))
    return t('errors.tag_exists');

  // ─── Authentication ───────────────────────────────────────────────────────

  if (
    msg.includes('user already exists') ||
    (msg.includes('utilisateur') && msg.includes('existe déjà'))
  ) return t('errors.user_exists');

  if (
    msg.includes('invalid email or password') ||
    msg.includes('email ou mot de passe incorrect') ||
    msg.includes('invalid credentials') ||
    msg.includes('mot de passe incorrect') ||
    msg.includes('identifiants invalides') ||
    msg === 'incorrect password'
  ) return t('errors.invalid_credentials');

  if (
    (msg.includes('account') && msg.includes('lock')) ||
    (msg.includes('compte') && msg.includes('bloqu')) ||
    msg.includes('temporairement bloqué') ||
    msg.includes('temporarily locked')
  ) return t('errors.account_locked');

  if (
    (msg.includes('too many') && msg.includes('attempt')) ||
    msg.includes('trop de tentatives') ||
    msg.includes('trop d\'essais')
  ) return t('errors.too_many_attempts');

  if (
    (msg.includes('account') && msg.includes('deactivated')) ||
    (msg.includes('compte') && (msg.includes('désactivé') || msg.includes('desactivé')))
  ) return t('errors.account_deactivated');

  if (
    msg.includes('not been approved') ||
    msg.includes('not approved') ||
    msg.includes('en attente') && msg.includes('approbation') ||
    msg.includes('approved by an administrator')
  ) return t('errors.account_pending');

  if (
    msg.includes('session expired') ||
    msg.includes('session') && msg.includes('revoked') ||
    (msg.includes('session') && msg.includes('révoquée'))
  ) return t('errors.session_expired');

  if (
    (msg.includes('invalid') && msg.includes('token')) ||
    (msg.includes('expired') && msg.includes('token')) ||
    msg.includes('jeton invalide')
  ) return t('errors.invalid_token');

  if (
    msg.includes('verification token') ||
    msg.includes('verify your email') ||
    msg.includes('please verify') ||
    (msg.includes('envoyé') && msg.includes('email') && msg.includes('vérif'))
  ) return t('errors.verification_email_sent');

  // ─── Password ─────────────────────────────────────────────────────────────

  if (
    msg.includes('passwords do not match') ||
    msg.includes('les mots de passe ne correspondent pas') ||
    msg.includes('password confirmation')
  ) return t('errors.passwords_mismatch');

  if (
    (msg.includes('password') && (msg.includes('weak') || msg.includes('strength'))) ||
    (msg.includes('mot de passe') && msg.includes('trop faible'))
  ) return t('errors.password_weak');

  if (
    msg.includes('current password is incorrect') ||
    msg.includes('mot de passe actuel') && msg.includes('incorrect') ||
    msg === 'incorrect password. account deletion failed.'
  ) return t('errors.wrong_password');

  if (
    msg.includes('current password') && msg.includes('required') ||
    msg.includes('le mot de passe actuel est requis')
  ) return t('errors.current_password_required');

  if (
    msg.includes('new password') && msg.includes('required') ||
    msg.includes('le nouveau mot de passe est requis')
  ) return t('errors.new_password_required');

  // Password DTO validation (French, from class-validator)
  if (msg.includes('le mot de passe doit contenir') && msg.includes('8 caractères'))
    return t('errors.pw_min_length');
  if (msg.includes('le mot de passe doit contenir') && msg.includes('minuscule'))
    return t('errors.pw_lowercase');
  if (msg.includes('le mot de passe doit contenir') && msg.includes('majuscule'))
    return t('errors.pw_uppercase');
  if (msg.includes('le mot de passe doit contenir') && msg.includes('chiffre'))
    return t('errors.pw_number');
  if (msg.includes('le mot de passe doit contenir') && msg.includes('spécial'))
    return t('errors.pw_special');

  // ─── Email ────────────────────────────────────────────────────────────────

  if (
    (msg.includes('email') && (msg.includes('already') || msg.includes('already in use'))) ||
    (msg.includes('email') && (msg.includes('déjà') || msg.includes('déjà utilisé'))) ||
    msg.includes('adresse email déjà') ||
    msg.includes('this email address is already in use')
  ) return t('errors.email_taken');

  if (
    (msg.includes('email') && msg.includes('not verified')) ||
    (msg.includes('email') && msg.includes('non vérifié')) ||
    msg.includes('verify your email') ||
    msg.includes('please verify')
  ) return t('errors.email_not_verified');

  if (
    msg.includes('google accounts cannot change') ||
    msg.includes('google account') && msg.includes('email') ||
    msg.includes('manage your email at myaccount.google.com')
  ) return t('errors.google_email');

  if (
    msg.includes('new email is the same') ||
    msg.includes('the same as your current email') ||
    msg.includes('même email') ||
    msg.includes('même adresse')
  ) return t('errors.same_email');

  if (
    msg.includes('no pending email change') ||
    msg.includes('aucun changement d\'email en attente')
  ) return t('errors.no_email_change');

  if (
    msg.includes('this confirmation link has expired') ||
    msg.includes('lien de confirmation') && msg.includes('expiré') ||
    msg.includes('link has expired')
  ) return t('errors.link_expired');

  // ─── User / Resource not found ────────────────────────────────────────────

  if (
    msg === 'user not found' ||
    msg.includes('user with given email does not exist') ||
    msg.includes('utilisateur introuvable') ||
    msg.includes('utilisateur non trouvé')
  ) return t('errors.user_not_found');

  if (
    msg === 'publication not found' ||
    msg.includes('publication introuvable') ||
    msg.includes('publication non trouvé')
  ) return t('errors.publication_not_found');

  if (
    msg === 'comment not found' ||
    msg.includes('commentaire non trouvé') ||
    msg.includes('commentaire parent non trouvé')
  ) return t('errors.comment_not_found');

  if (msg.includes('parent') && msg.includes('commentaire') && msg.includes('correspond'))
    return t('errors.parent_comment_mismatch');

  if (
    msg === 'category not found' ||
    msg.includes('catégorie introuvable') ||
    msg.includes('category') && msg.includes('not found')
  ) return t('errors.category_not_found');

  if (
    msg === 'tag not found' ||
    msg.includes('tag') && msg.includes('not found') ||
    msg.includes('tag introuvable')
  ) return t('errors.tag_not_found');

  if (
    msg.includes('notification non trouvée') ||
    msg.includes('notification not found')
  ) return t('errors.notification_not_found');

  if (
    msg.includes('message introuvable') ||
    msg === 'message not found'
  ) return t('errors.message_not_found');

  if (
    msg === 'not found' ||
    msg.includes('resource not found') ||
    msg.includes('ressource introuvable')
  ) return t('errors.not_found');

  // ─── Authorisation / Permissions ─────────────────────────────────────────

  if (
    msg.includes('unauthorized') ||
    msg.includes('non autorisé') ||
    msg === 'non autorisé' ||
    msg.includes('forbidden') ||
    msg.includes('interdit') ||
    msg.includes('access denied') ||
    msg.includes('vous ne pouvez') && msg.includes('modifier') ||
    msg.includes('vous ne pouvez') && msg.includes('supprimer')
  ) return t('errors.unauthorized');

  if (
    msg.includes('accès à la conversation refusé') ||
    msg.includes('conversation access denied')
  ) return t('errors.conversation_access_denied');

  if (
    msg.includes('cannot change another user') ||
    msg.includes('you cannot change another') ||
    msg.includes('modifier que votre propre profil')
  ) return t('errors.forbidden');

  // ─── Self-action prevention ───────────────────────────────────────────────

  if (
    msg.includes('cannot follow yourself') ||
    msg.includes('vous ne pouvez pas vous suivre')
  ) return t('errors.cant_follow_self');

  if (
    msg.includes('vous ne pouvez pas vous envoyer') ||
    msg.includes('cannot send') && msg.includes('yourself') ||
    msg.includes('send a request to yourself')
  ) return t('errors.cant_request_self');

  if (
    msg.includes('vous ne pouvez pas vous bloquer') ||
    msg.includes('cannot block yourself')
  ) return t('errors.cant_block_self');

  if (
    msg.includes('vous ne pouvez pas signaler votre propre') ||
    msg.includes('cannot report yourself') ||
    msg.includes('signaler votre propre')
  ) return t('errors.cant_report_self');

  // ─── Follow / Friends ─────────────────────────────────────────────────────

  if (
    msg.includes('already following') ||
    msg.includes('déjà abonné') ||
    msg.includes('vous suivez déjà')
  ) return t('errors.already_following');

  if (
    msg.includes('you are not following') ||
    msg.includes('vous ne suivez pas')
  ) return t('errors.not_following');

  if (
    msg.includes('vous êtes déjà amis') ||
    msg.includes('already friends')
  ) return t('errors.already_friends');

  // ─── Chat / Messaging ─────────────────────────────────────────────────────

  if (
    msg.includes('une demande est déjà en attente') ||
    msg.includes('request already pending') ||
    msg.includes('request is already pending')
  ) return t('errors.request_pending');

  if (
    msg.includes('la demande a déjà été acceptée') ||
    msg.includes('request already accepted') ||
    msg.includes('already been accepted')
  ) return t('errors.request_already_accepted');

  if (
    msg.includes('demande introuvable') ||
    msg.includes('demande') && msg.includes('déjà traitée') ||
    msg.includes('request not found') ||
    msg.includes('already handled')
  ) return t('errors.request_not_found');

  if (
    msg.includes('vous ne pouvez écrire qu\'à vos amis') ||
    msg.includes('only write to your friends') ||
    msg.includes('must be friends')
  ) return t('errors.not_friends');

  if (
    msg.includes('le message ne peut pas être vide') ||
    msg.includes('message cannot be empty') ||
    msg.includes('message content cannot be empty')
  ) return t('errors.message_empty');

  if (
    msg.includes('cette réaction n\'existe pas') ||
    msg.includes('reaction does not exist')
  ) return t('errors.reaction_not_found');

  // ─── Reports / Already reported ───────────────────────────────────────────

  if (
    msg.includes('vous avez déjà signalé') ||
    msg.includes('already reported') ||
    msg.includes('déjà signalé')
  ) return t('errors.already_reported');

  // ─── Link / Token validity ────────────────────────────────────────────────

  if (
    msg === 'invalid link' ||
    msg.includes('invalid or expired link') ||
    msg.includes('lien invalide') ||
    msg.includes('invalid confirmation link') ||
    msg.includes('lien de confirmation invalide')
  ) return t('errors.invalid_link');

  if (
    msg.includes('invalid or expired confirmation link') ||
    msg.includes('no pending email change found')
  ) return t('errors.link_expired');

  // ─── Google account restrictions ─────────────────────────────────────────

  if (
    msg.includes('this endpoint is only for google accounts') ||
    msg.includes('only for google accounts')
  ) return t('errors.google_only');

  // ─── Service-level fallback strings (thrown by services/*.ts) ────────────

  if (msg === 'signup failed')           return t('errors.signup_failed');
  if (msg === 'invalid credentials')     return t('errors.invalid_credentials');
  if (msg === 'failed to fetch profile') return t('errors.fetch_profile_failed');
  if (msg === 'update failed')           return t('errors.update_failed');
  if (msg === 'failed to change password') return t('errors.change_password_failed');
  if (msg === 'failed to send reset password email') return t('errors.reset_email_failed');
  if (msg === 'invalid or expired link') return t('errors.invalid_link');
  if (msg === 'failed to reset password') return t('errors.reset_password_failed');
  if (msg === 'export failed')           return t('errors.export_failed');

  // ─── HTTP / Network ───────────────────────────────────────────────────────

  if (/^(erreur http|http error):\s*\d+$/.test(msg))  return t('errors.server_error');
  if (msg.includes('500') || msg.includes('internal server error')) return t('errors.server_error');
  if (msg.includes('semantic search error') || msg.includes('erreur lors du traitement'))
    return t('errors.server_error');

  if (
    msg.includes('network') ||
    msg.includes('réseau') ||
    msg.includes('failed to fetch') ||
    msg.includes('connexion')
  ) return t('errors.network_error');

  // ─── Validation ───────────────────────────────────────────────────────────

  if (
    msg.includes('validation') ||
    (msg.includes('invalid') && msg.includes('format')) ||
    msg.includes('format invalide') ||
    msg.includes('query parameter') && msg.includes('required')
  ) return t('errors.validation_error');

  if (
    msg.includes('un tag ne peut pas dépasser') ||
    msg.includes('tag cannot exceed')
  ) return t('errors.tag_too_long');

  // ─── Fallback — return raw message (no info lost) ─────────────────────────
  return raw;
}
