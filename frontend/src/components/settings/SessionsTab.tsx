// components/settings/SessionsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  X, 
  Laptop, 
  LogOut,
  Globe,
  Browser
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { userService, type Session } from '../../../services/user.service';

// Custom browser icons
const ChromeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-5-8a5 5 0 1 1 10 0 5 5 0 0 1-10 0zm2 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/>
  </svg>
);

const FirefoxIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
  </svg>
);

const SafariIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2v4M22 12h-4M12 20v4M2 12h4" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

const EdgeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.86 17.5c-1.07 1.55-2.48 2.78-4.18 3.65-1.7.87-3.55 1.31-5.53 1.31-2.06 0-3.98-.45-5.74-1.35-1.76-.9-3.24-2.16-4.44-3.78-1.2-1.62-2.09-3.5-2.67-5.63-.58-2.13-.68-4.28-.3-6.45.38-2.17 1.18-4.12 2.4-5.84C3.8 1.11 5.3-.03 7.04.84c1.74.87 2.52 2.56 2.34 4.51-.18 1.95-1.33 3.76-3.43 5.43.45 2.18 1.5 4.02 3.15 5.52 1.65 1.5 3.61 2.39 5.87 2.67 2.26.28 4.33-.09 6.21-1.11.79-.43 1.46-.94 2.01-1.53.55-.59.98-1.24 1.29-1.95.31-.71.47-1.45.48-2.22.01-.77-.1-1.52-.33-2.25-.23-.73-.58-1.41-1.05-2.04-.47-.63-1.04-1.17-1.71-1.62-.67-.45-1.41-.78-2.22-.99-.81-.21-1.66-.27-2.55-.18-.89.09-1.75.33-2.58.72-.83.39-1.58.9-2.25 1.53-.67.63-1.21 1.35-1.62 2.16-1.34-1.21-2.27-2.65-2.79-4.32 2.14-1.97 3.65-4.26 4.53-6.87.88-2.61 1.04-5.28.48-8.01 1.35.39 2.61 1.02 3.78 1.89 1.17.87 2.18 1.9 3.03 3.09.85 1.19 1.53 2.48 2.04 3.87.51 1.39.84 2.82.99 4.29.15 1.47.12 2.95-.09 4.44-.21 1.49-.61 2.93-1.2 4.32z"/>
  </svg>
);

// Custom OS icons
const WindowsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5.5L11 4.1v7.2H3V5.5zm0 12.1l8 1.4v-7.2H3v5.8zm9-13.7l9-1.4v7.1h-9V3.9zm0 15.1l9 1.4v-7.1h-9v5.7z"/>
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.02.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const LinuxIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 14c-2.21 0-4-1.79-4-4h8c0 2.21-1.79 4-4 4z"/>
  </svg>
);

export default function SessionsTab() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userService.getMySessions();
      setSessions(data);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || t('sessions.load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    setError('');
    setSuccess('');
    try {
      await userService.revokeSession(sessionId);
      setSuccess(t('sessions.revoked_success'));
      await loadSessions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error revoking session:', err);
      setError(err.message || t('sessions.revoke_error'));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm(t('sessions.revoke_all_confirm'))) return;
    
    setRevokingAll(true);
    setError('');
    setSuccess('');
    try {
      await userService.revokeAllOtherSessions();
      setSuccess(t('sessions.all_others_revoked'));
      await loadSessions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error revoking all sessions:', err);
      setError(err.message || t('sessions.revoke_all_error'));
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    const browserLower = browser?.toLowerCase();
    switch (browserLower) {
      case 'chrome':
        return <ChromeIcon className="w-4 h-4" />;
      case 'firefox':
        return <FirefoxIcon className="w-4 h-4" />;
      case 'safari':
        return <SafariIcon className="w-4 h-4" />;
      case 'edge':
        return <EdgeIcon className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getOsIcon = (os: string) => {
    const osLower = os?.toLowerCase();
    switch (osLower) {
      case 'windows':
        return <WindowsIcon className="w-4 h-4" />;
      case 'macos':
        return <AppleIcon className="w-4 h-4" />;
      case 'linux':
        return <LinuxIcon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  // Check if a session is the current one (last used within last 5 minutes)
  const isCurrentSession = (session: Session) => {
    const lastUsed = new Date(session.lastUsedAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUsed.getTime()) / 1000 / 60;
    return diffMinutes < 5;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#168F6F', borderTopColor: 'transparent' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('sessions.title')}
          </h3>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOtherSessions}
            disabled={revokingAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {revokingAll ? (
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {t('sessions.revoke_all_others')}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('sessions.description')}
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Monitor className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('sessions.no_sessions')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const current = isCurrentSession(session);
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  current
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    current
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {session.deviceType?.charAt(0).toUpperCase() + session.deviceType?.slice(1) || 'Unknown'} Device
                      </span>
                      {current && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          {t('sessions.current_session')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        {getBrowserIcon(session.browser)}
                        {session.browser || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        {getOsIcon(session.os)}
                        {session.os || 'Unknown'}
                      </span>
                      {session.ipAddress && (
                        <span>IP: {session.ipAddress}</span>
                      )}
                      {session.location && (
                        <span>📍 {session.location}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Last active: {formatDate(session.lastUsedAt)}</span>
                      <span>Expires: {formatDate(session.expiresAt)}</span>
                    </div>
                  </div>
                </div>
                
                {!current && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title={t('sessions.revoke')}
                  >
                    {revokingId === session.id ? (
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}