'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ChevronLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { forgotPassword } from '../../../../services/auth.service';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await forgotPassword(email);
      setStatus('success');
      setMessage(response.message || 'Reset link sent! Check your inbox.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An error occurred. Please try again.');
    }
  };

  const handleTryAgain = () => {
    setStatus('idle');
    setMessage('');
    setEmail('');
  };

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

        <div className="p-8">
          {/* Back link */}
          <Link
            href="/signin"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Sign In
          </Link>

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

          {/* ── IDLE / LOADING ── */}
          {(status === 'idle' || status === 'loading') && (
            <>
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#168F6F15' }}
                >
                  <Mail className="w-8 h-8" style={{ color: '#168F6F' }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                <p className="text-gray-500 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@example.com"
                    required
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400"
                    style={{ focusRingColor: '#168F6F' }}
                    onFocus={(e) => (e.target.style.borderColor = '#168F6F')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: '#168F6F' }}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── SUCCESS ── */}
          {status === 'success' && (
            <div className="text-center">
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#168F6F15' }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: '#168F6F' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox!</h2>
              <p className="text-gray-500 text-sm mb-6">
                {message || 'A password reset link has been sent to your email address.'}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 font-semibold rounded-xl border-2 text-sm transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#168F6F', color: '#168F6F' }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full py-3 font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-500 text-sm mb-6">
                {message || 'An error occurred. Please try again.'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                  style={{ backgroundColor: '#168F6F' }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full py-3 font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Need help?{' '}
            <a
              href="mailto:support@imknow.com"
              className="hover:underline"
              style={{ color: '#168F6F' }}
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}