"use client";

import { ThemeProvider } from "@/context/ThemeContext";
import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPanelActive, setIsPanelActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsPanelActive(pathname === '/signup');
  }, [pathname]);

  const handleSignUpClick = () => {
    setIsPanelActive(true);
    router.push('/signup');
  };

  const handleSignInClick = () => {
    setIsPanelActive(false);
    router.push('/signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 font-poppins relative overflow-hidden bg-[#0a1a14]">
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

      <ThemeProvider>
        <div className={`auth-wrapper relative z-10 ${isPanelActive ? 'panel-active' : ''}`}>
          
          <div className="auth-form-box login-form-box">
            <div className="form-container">
              <div className="w-full">
                <Suspense fallback={null}>
                  <SignInForm />
                </Suspense>
              </div>
              {!isMobile && (
                <div className="mobile-switch">
                  <p>Don't have an account?</p>
                  <button onClick={handleSignUpClick}>Sign Up</button>
                </div>
              )}
            </div>
          </div>

          <div className="auth-form-box register-form-box">
            <div className="form-container">
              <div className="w-full">
                <SignUpForm />
              </div>
              {!isMobile && (
                <div className="mobile-switch">
                  <p>Already have an account?</p>
                  <button onClick={handleSignInClick}>Sign In</button>
                </div>
              )}
            </div>
          </div>

          {/* Slide Panel */}
          <div className="slide-panel-wrapper">
            <div className="slide-panel">
              
              <div className="panel-content panel-content-left">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute top-6 left-6 z-20"
                >
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-all duration-300 group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back
                  </Link>
                </motion.div>
                
                <div className="relative w-44 h-44 mb-4">
                  <Image
                    src="/images/logo/logo_2_dark.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Welcome Back!
                </h1>
                <p className="text-white/80 text-sm text-center max-w-xs mb-5">
                  Stay connected by logging in with your credentials and continue your experience
                </p>
                <button className="transparent-btn" onClick={handleSignInClick}>
                  Sign In
                </button>
              </div>
              
              <div className="panel-content panel-content-right">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute top-6 left-6 z-20"
                >
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-all duration-300 group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back
                  </Link>
                </motion.div>
                
                <div className="relative w-44 h-44 mb-4">
                  <Image
                    src="/images/logo/logo_2_dark.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Hey There!
                </h1>
                <p className="text-white/80 text-sm text-center max-w-xs mb-5">
                  Begin your amazing journey by creating an account with us today
                </p>
                <button className="transparent-btn" onClick={handleSignUpClick}>
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
          @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

          .font-poppins {
            font-family: 'Poppins', sans-serif;
          }

          .auth-wrapper {
            background-color: #fff;
            border-radius: 32px;
            box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.08);
            position: relative;
            overflow: hidden;
            width: 1100px;
            max-width: 95%;
            min-height: 700px;
          }

          .auth-form-box {
            position: absolute;
            top: 0;
            height: 100%;
            transition: all 0.6s ease-in-out;
          }

          .login-form-box {
            left: 0;
            width: 50%;
            z-index: 2;
          }

          .auth-wrapper.panel-active .login-form-box {
            transform: translateX(100%);
          }

          .register-form-box {
            left: 0;
            width: 50%;
            opacity: 0;
            z-index: 1;
          }

          .auth-wrapper.panel-active .register-form-box {
            transform: translateX(100%);
            opacity: 1;
            z-index: 5;
            animation: show 0.6s;
          }

          @keyframes show {
            0%, 49.99% { opacity: 0; z-index: 1; }
            50%, 100% { opacity: 1; z-index: 5; }
          }

          .form-container {
            background-color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 0 45px;
            height: 100%;
            text-align: center;
            overflow-y: auto;
          }

          .form-container::-webkit-scrollbar {
            width: 5px;
          }

          .form-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }

          .form-container::-webkit-scrollbar-thumb {
            background: #168F6F;
            border-radius: 10px;
          }

          .form-container::-webkit-scrollbar-thumb:hover {
            background: #0F6B54;
          }

          .slide-panel-wrapper {
            position: absolute;
            top: 0;
            left: 50%;
            width: 50%;
            height: 100%;
            overflow: hidden;
            transition: transform 0.6s ease-in-out;
            z-index: 100;
          }

          .auth-wrapper.panel-active .slide-panel-wrapper {
            transform: translateX(-100%);
          }

          .slide-panel {
            background: linear-gradient(135deg, #168F6F 0%, #0F6B54 100%);
            background-size: cover;
            background-position: center;
            color: #FFFFFF;
            position: relative;
            left: -100%;
            height: 100%;
            width: 200%;
            transform: translateX(0);
            transition: transform 0.6s ease-in-out;
          }

          .auth-wrapper.panel-active .slide-panel {
            transform: translateX(50%);
          }

          .panel-content {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 0 40px;
            text-align: center;
            top: 0;
            height: 100%;
            width: 50%;
            transform: translateX(0);
            transition: transform 0.6s ease-in-out;
          }

          .panel-content-left {
            transform: translateX(-20%);
          }

          .auth-wrapper.panel-active .panel-content-left {
            transform: translateX(0);
          }

          .panel-content-right {
            right: 0;
            transform: translateX(0);
          }

          .auth-wrapper.panel-active .panel-content-right {
            transform: translateX(20%);
          }

          .social-links {
            margin: 20px 0;
          }

          .social-links a {
            border: 2px solid #e0e0e0;
            border-radius: 50%;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin: 0 8px;
            height: 40px;
            width: 40px;
            transition: all 0.3s ease;
            color: #168F6F;
            text-decoration: none;
          }

          .social-links a:hover {
            border-color: #168F6F;
            background: #168F6F;
            color: #fff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(22, 143, 111, 0.4);
          }

          .transparent-btn {
            background: transparent;
            border: 2px solid #FFFFFF;
            border-radius: 30px;
            color: #FFFFFF;
            font-size: 14px;
            font-weight: 600;
            padding: 10px 40px;
            letter-spacing: 1px;
            text-transform: uppercase;
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .transparent-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .mobile-switch {
            display: none;
          }

          @media (min-width: 769px) {
            .login-form-box .back-link,
            .register-form-box .back-link {
              display: none;
            }
          }

          @media (max-width: 768px) {
            .auth-wrapper {
              min-height: auto;
              width: 100%;
              max-width: 100%;
              border-radius: 20px;
            }

            .auth-form-box {
              position: static !important;
              width: 100% !important;
              transform: none !important;
              opacity: 1 !important;
            }

            .login-form-box,
            .register-form-box {
              position: static !important;
              width: 100% !important;
              left: 0 !important;
              transform: none !important;
              opacity: 1 !important;
              z-index: 1 !important;
            }

            .register-form-box {
              display: none;
            }

            .auth-wrapper.panel-active .login-form-box {
              display: none;
            }

            .auth-wrapper.panel-active .register-form-box {
              display: block;
            }

            .slide-panel-wrapper {
              display: none !important;
            }

            .form-container {
              padding: 35px 25px;
              height: auto;
            }

            .mobile-switch {
              display: block;
              margin-top: 20px;
            }

            .mobile-switch p {
              margin: 10px 0;
              font-size: 14px;
              color: #666;
            }

            .mobile-switch button {
              background: transparent;
              color: #168F6F;
              border: 2px solid #168F6F;
              padding: 10px 30px;
              border-radius: 25px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.3s ease;
            }

            .mobile-switch button:hover {
              background: #168F6F;
              color: #fff;
            }
          }
        `}</style>
      </ThemeProvider>
    </div>
  );
}