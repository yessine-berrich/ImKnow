import GridShape from "@/components/common/GridShape";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Page Non Trouvée | ImKnow",
  description: "La page que vous recherchez n'existe pas ou a été déplacée.",
};

export default function Error404() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1 bg-gradient-to-br from-[#e8f3f0] to-[#d4ebe5]">
      <GridShape />
      <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-32 h-16 relative">
            <Image
              src="/images/logo/logo_2_dark.png"
              alt="ImKnow Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="mb-4 font-bold text-[#168F6F] text-title-md xl:text-title-2xl">
          404
        </h1>
        
        <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white">
          Page Non Trouvée
        </h2>

        <div className="relative w-full h-32 mb-6">
          <Image
            src="/images/error/404.svg"
            alt="404"
            className="dark:hidden w-full h-full object-contain"
            width={472}
            height={152}
          />
          <Image
            src="/images/error/404-dark.svg"
            alt="404"
            className="hidden dark:block w-full h-full object-contain"
            width={472}
            height={152}
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