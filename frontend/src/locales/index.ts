import frSettings from './fr/settings.json';
import enSettings from './en/settings.json';
import frCommon from './fr/common.json';
import enCommon from './en/common.json';
import frConnections from './fr/connections.json';
import enConnections from './en/connections.json';
import frProfile from './fr/profile.json';
import enProfile from './en/profile.json';
import frActivity from './fr/activity.json';
import enActivity from './en/activity.json';
import frChat from './fr/chat.json';
import enChat from './en/chat.json';
import frLayout from './fr/layout.json';
import enLayout from './en/layout.json';
import frHome from './fr/home.json';
import enHome from './en/home.json';
import frPages from './fr/pages.json';
import enPages from './en/pages.json';

export const resources = {
  fr: { ...frSettings, ...frCommon, ...frConnections, ...frProfile, ...frActivity, ...frChat, ...frLayout, ...frHome, ...frPages },
  en: { ...enSettings, ...enCommon, ...enConnections, ...enProfile, ...enActivity, ...enChat, ...enLayout, ...enHome, ...enPages },
};

export type Language = 'fr' | 'en';
export type TranslationKey = keyof typeof resources.fr;
