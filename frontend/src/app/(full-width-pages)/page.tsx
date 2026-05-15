'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ChevronRight } from 'lucide-react';

export default function WelcomePageFinal() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1a14]">
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

      {/* Subtle dark overlay for text contrast */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 md:px-12">
        <div className="w-full max-w-6xl mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <Image
              src="/images/logo/logo_2_dark.png"
              alt="ImKnow Logo"
              width={500}
              height={200}
              className="object-contain"
              priority
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/25">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-medium text-white/90">Intelligent Knowledge Management Platform</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-center mb-6"
          >
            <span className="text-white drop-shadow-lg">
              Your knowledge,
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-[#1AA886] bg-clip-text text-transparent drop-shadow-lg">
              intelligently organized
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-base md:text-lg text-white/80 text-center max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Transform how your team shares and uses knowledge.
            <span className="font-semibold text-emerald-300"> ImKnow</span> provides all the tools you need
            for efficient and collaborative knowledge management.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <Link href="/signin">
              <button className="px-8 py-3.5 bg-[#168F6F] text-white rounded-xl font-semibold text-base hover:bg-[#1AA886] transition-all duration-300 shadow-lg shadow-emerald-900/40 hover:shadow-xl hover:scale-105 flex items-center gap-2">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/signup">
              <button className="px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-base border-2 border-white/40 hover:bg-white/20 hover:border-white/60 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
                Sign Up
                <ChevronRight className="inline-block ml-1 w-5 h-5" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}