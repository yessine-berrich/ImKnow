import GridShape from "@/components/common/GridShape";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1 bg-gradient-to-br from-[#e8f3f0] to-[#d4ebe5]">
      <GridShape />
      <div className="mx-auto w-full max-w-[600px] text-center">
        
        <h2 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white">
          Page Non Trouvée
        </h2>

        <div className="relative w-full h-64 md:h-80 lg:h-96 mb-8">
          <Image
            src="/images/error/404.png"
            alt="404"
            className="w-full h-full object-contain"
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            priority
          />
        </div>

        <p className="mb-8 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
          Oups ! La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#168F6F] px-6 py-3.5 text-sm font-medium text-white shadow-lg hover:bg-[#0F6B54] transition-all duration-300 hover:scale-105 hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Retour à l'Accueil
        </Link>
      </div>
    </div>
  );
}