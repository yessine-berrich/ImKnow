'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from 'lucide-react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verify = async () => {
      const userId = params?.userId;
      const token = params?.token;

      if (!userId || !token) {
        setStatus('error');
        setErrorMessage('Lien de vérification invalide.');
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/users/verify-email/${userId}/${token}`,
          { method: 'GET' },
        );

        if (response.ok) {
          setStatus('success');
        } else {
          const data = await response.json().catch(() => null);
          setStatus('error');
          setErrorMessage(
            data?.message || 'Le lien est invalide ou a expiré.',
          );
        }
      } catch {
        setStatus('error');
        setErrorMessage('Une erreur réseau est survenue. Veuillez réessayer.');
      }
    };

    verify();
  }, [params]);

  // Countdown redirect on success
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown === 0) {
      router.push('/signin?verified=true');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/aurora-bg-blur.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/30" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-10">
        {/* Header band */}
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #168F6F, #0e6b52)' }} />

        <div className="p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <Image
                src="/images/logo/logo_2.png"
                alt="Logo"
                fill
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>

          {/* ── LOADING ── */}
          {status === 'loading' && (
            <div>
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#168F6F15' }}
              >
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#168F6F' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vérification en cours…
              </h2>
              <p className="text-gray-500 text-sm">
                Veuillez patienter pendant que nous activons votre compte.
              </p>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {status === 'success' && (
            <div>
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#168F6F15' }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: '#168F6F' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email vérifié !
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Votre adresse email a été confirmée avec succès. Vous pouvez
                maintenant vous connecter.
              </p>

              {/* Countdown bar */}
              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-2">
                  Redirection dans{' '}
                  <span className="font-semibold" style={{ color: '#168F6F' }}>
                    {countdown}s
                  </span>
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-1000"
                    style={{
                      backgroundColor: '#168F6F',
                      width: `${(countdown / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => router.push('/signin?verified=true')}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: '#168F6F' }}
              >
                Se connecter maintenant
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <div>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vérification échouée
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {errorMessage || 'Le lien est invalide ou a expiré (validité 24h).'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/signup')}
                  className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                  style={{ backgroundColor: '#168F6F' }}
                >
                  Créer un nouveau compte
                </button>
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full py-3 font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Besoin d'aide ?{' '}
            <a
              href="mailto:support@imknow.com"
              className="hover:underline"
              style={{ color: '#168F6F' }}
            >
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}